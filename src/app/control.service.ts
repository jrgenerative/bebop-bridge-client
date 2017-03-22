import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import * as io from "socket.io-client";
import { Observable } from 'rxjs/Observable';
import { ConnectableObservable } from 'rxjs/observable/ConnectableObservable';
import { Flightplan } from 'bebop-bridge-shared';

/**
 * Drone control request.
 */
class DroneControlRequest {
    constructor(
        public method: string = "",
        public value: any) {
    }
}

/**
 * Response for drone control requests.
 * This class shouldn't have any functions, since it is being returned
 * from service calls as Observable<DroneControlResponse> which doesn't
 * seem to allocate the correct prototype... strange stuff.
 */
class DroneControlResponse {
    constructor(public message: string = "") {
    }
}

export class PositionData {

    constructor(
        public latitude?: number, // decimal degrees, 500.0 if not available"
        public longitude?: number, // decimal degrees, 500.0 if not available"
        public altitude?: number // meters
    ) {
        if (!latitude) {
            this.latitude = 500;
        }
        if (!longitude) {
            this.altitude = 500;
        }
        if (!altitude) {
            this.altitude = 0;
        }
    }

    get isValid(): boolean {
        if (this.latitude <= 90.0 && this.latitude >= -90.0 &&
            this.longitude <= 180.0 && this.longitude >= -180.0) {
            return true;
        }
        else {
            return false;
        }
    }
}

/**
 * Everything related to sending and receiving data to and from the vehicle.
 */
@Injectable()
export class ControlService {

    private _urlControl = 'http://' + window.location.hostname + ':' + process.env.API_PORT + '/control'; // 'http://localhost:4000/control';  // URL to drone control service
    private _urlDownlink = 'http://' + window.location.hostname + ':' + process.env.API_PORT + '/control/downlink'; // 'http://localhost:4000/downlink'; // URL on which socket.io sends drone data
    //private _urlControl = 'http://' + process.env.API_URL + ':' + process.env.API_PORT + '/control'; // 'http://localhost:4000/control';  // URL to drone control service
    //private _urlDownlink = 'http://' + process.env.API_URL + ':' + process.env.API_PORT + '/control/downlink'; // 'http://localhost:4000/downlink'; // URL on which socket.io sends drone data
    private _socket: SocketIOClient.Socket = null; // socket for downlink messages

    private _obsConnectionQuality: ConnectableObservable<number> = null;
    private _obsBatteryLevel: ConnectableObservable<number> = null;
    private _obsError: ConnectableObservable<string> = null;
    private _obsSuccess: ConnectableObservable<string> = null;
    private _obsConnected: ConnectableObservable<boolean> = null;
    private _obsContact: ConnectableObservable<number> = null;
    private _obsGpsFix: ConnectableObservable<boolean> = null;
    private _obsAutonomousFlightCalibState: ConnectableObservable<boolean> = null;
    private _obsAutonomousFlightGpsState: ConnectableObservable<boolean> = null;
    private _obsAutonomousFlightFlightPlanState: ConnectableObservable<boolean> = null;
    private _obsAutonomousFlightTakeOffState: ConnectableObservable<boolean> = null;
    private _obsMassStorageSize: ConnectableObservable<number> = null;
    private _obsMassStorageUsedSize: ConnectableObservable<number> = null;
    private _obsMassStorageFreeSize: ConnectableObservable<number> = null;
    private _obsMassStoregeFreeSizePercentage: ConnectableObservable<number> = null;
    private _obsPosition: ConnectableObservable<PositionData> = null;
    private _obsFlightplan: ConnectableObservable<Flightplan> = null;

    constructor(private http: Http) {

        // Create socket which delivers drone events
        this._socket = io(this._urlDownlink);

        // Create observables from socket events
        this._obsError = this.createHotObservable<string>('error');
        this._obsSuccess = this.createHotObservable<string>('success');
        this._obsConnectionQuality = this.createHotObservable<number>('connection-quality');
        this._obsBatteryLevel = this.createHotObservable<number>('battery-level');
        this._obsConnected = this.createHotObservable<boolean>('connected');
        this._obsContact = this.createHotObservable<number>('contact');
        this._obsGpsFix = this.createHotObservable<boolean>('gps-fix-state');
        this._obsMassStorageSize = this.createHotObservable<number>('mass-storage-size');
        this._obsMassStorageUsedSize = this.createHotObservable<number>('mass-storage-used-size');
        this._obsPosition = this.createHotObservable<PositionData>('position-event');

        // Remaining mass storage size
        this._obsMassStorageFreeSize = Observable.combineLatest(this._obsMassStorageSize, this._obsMassStorageUsedSize, (size, used) => {
            return size - used;
        }).publish();
        this._obsMassStorageFreeSize.connect();

        // Remaining mass storage in percentage
        this._obsMassStoregeFreeSizePercentage = Observable.combineLatest(this._obsMassStorageSize, this._obsMassStorageUsedSize, (size, used) => {
            if (size > 0 && used > 0) {
                return Math.round(100.0 - used / (size / 100));
            }
            else if (size > 0 && used === 0) {
                return 100.0;
            }
            else {
                return 0.0;
            }
        }).publish();
        this._obsMassStoregeFreeSizePercentage.connect();

        // Calibration state
        this._obsAutonomousFlightCalibState = Observable.create((observer) => {
            this._socket.on('autonomous-flight-check-state', (data) => {
                if (data.component === 'Calibration') { // Calibration, GPS, Mavlink_File, TakeOff
                    if (data.State === 1) {
                        observer.next(true);
                    }
                    else {
                        observer.next(false);
                    }
                }
            });
            return () => { };
        }).publish();
        this._obsAutonomousFlightCalibState.connect();

        // GPS fix state
        this._obsAutonomousFlightGpsState = Observable.create((observer) => {
            this._socket.on('autonomous-flight-check-state', (data) => {
                if (data.component === 'GPS') { // Calibration, GPS, Mavlink_File, TakeOff
                    if (data.State === 1) {
                        observer.next(true);
                    }
                    else {
                        observer.next(false);
                    }
                }
            });
            return () => { };
        }).publish();
        this._obsAutonomousFlightGpsState.connect();

        this._obsAutonomousFlightFlightPlanState = Observable.create((observer) => {
            this._socket.on('autonomous-flight-check-state', (data) => {
                if (data.component === 'Mavlink_File') { // Calibration, GPS, Mavlink_File, TakeOff
                    if (data.State === 1) {
                        observer.next(true);
                    }
                    else {
                        observer.next(false);
                    }
                }
            });
            return () => { };
        }).publish();
        this._obsAutonomousFlightFlightPlanState.connect();

        // Autonomous take-off state
        this._obsAutonomousFlightTakeOffState = Observable.create((observer) => {
            this._socket.on('autonomous-flight-check-state', (data) => {
                if (data.component === 'TakeOff') { // Calibration, GPS, Mavlink_File, TakeOff
                    if (data.State === 1) {
                        observer.next(true);
                    }
                    else {
                        observer.next(false);
                    }
                }
            });
            return () => { };
        }).publish();
        this._obsAutonomousFlightTakeOffState.connect();

        // When a flight plan is received
        this._obsFlightplan = Observable.create((observer) => {
            this._socket.on('flightplan', (data) => {
                observer.next(new Flightplan(data._mavlink));
            });
        }).publish();
        this._obsFlightplan.connect();

    }

    // Observables
    // =========================================================================

    /**
     * Get an observable which delivers connection quality data.
     */
    get connectionQuality(): Observable<number> {
        return this._obsConnectionQuality;
    }

    /**
     * Get an observable which is reports if backend is connected with drone. 
     */
    get connected(): Observable<boolean> {
        return this._obsConnected;
    }

    /**
     * Get an observable which indicates the gps fix state using a boolean where false equals no fix, true denotes fix acquired.
     */
    get gpsFixState(): Observable<boolean> {
        return this._obsGpsFix;
    }

    /**
     * Get an observable which delivers error messages.
     */
    get error(): Observable<string> {
        return this._obsError;
    }

    /**
     * Get an observable which delivers success messages.
     */
    get success(): Observable<string> {
        return this._obsSuccess;
    }

    /**
     * Get an observable which reports seconds since last contact between backend and drone.
     */
    get contact(): Observable<number> {
        return this._obsContact;
    }

    /**
     * Get an observable which reports if calibration is ok for autonomous flight.
     */
    get calibrationForAutonomousFlightOk(): Observable<boolean> {
        return this._obsAutonomousFlightCalibState;
    }

    /**
     * Get an observable which reports if gps is ok for autonomous flight.
     */
    get gpsForAutonomousFlightOk(): Observable<boolean> {
        return this._obsAutonomousFlightGpsState;
    }

    /**
     * Get an observable which reports if flight plan file is ok (present) for autonomous flight.
     */
    get flightPlanForAutonomousFlightOk(): Observable<boolean> {
        return this._obsAutonomousFlightFlightPlanState;
    }

    /**
     * Get an observable which reports if take-off is ok for autonomous flight.
     */
    get takeOffForAutonmousFlightOk(): Observable<boolean> {
        return this._obsAutonomousFlightTakeOffState;
    }

    /**
     * Get an observable which reports the battery level in percentage from 0 to 100.
     */
    get batteryLevel(): Observable<number> {
        return this._obsBatteryLevel;
    }

    /**
     * Get an observable which reports the size of the onboard mass storage in MBytes.
     */
    get massStorageSize(): Observable<number> {
        return this._obsMassStorageSize;
    }

    /**
     * Get an observable which reports the size of used onboard mass storage in MBytes.
     */
    get massStorageUsedSize(): Observable<number> {
        return this._obsMassStorageUsedSize;
    }

    /**
     * Get an observable which reports the size of free space on the onboard mass storage in MBytes.
     */
    get massStorageFreeSize(): Observable<number> {
        return this._obsMassStorageFreeSize;
    }

    /**
     * Get an observable which reports the size of free space on the onboard mass storage in percentage [0...100].
     */
    get massStorageFreeSizePercent(): Observable<number> {
        return this._obsMassStoregeFreeSizePercentage;
    }

    /**
     * Get an observable which reports the drones position.
     * If GPS fix is lost temporarily, the last position remains 
     * the last observed status.
     */
    get position(): Observable<PositionData> {
        return this._obsPosition;
    }

    /**
     * Get an observable which delivers the flight plan when it changes on the vehicle.
     */
    get flightplan(): Observable<Flightplan> {
        return this._obsFlightplan;
    }

    // Commands / Calls
    // ====================================================================================

    /**
     * Connect to the drone.
     */
    connect(): Observable<DroneControlResponse> {
        let body = new DroneControlRequest("connect", 0);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(this._urlControl + '/connect', JSON.stringify(body), options)
            .map(res => res.json() || {})
            .catch(this.handleError);
    }

    /**
     * Takeoff. Requires the drone to be in armed and ready status.
     */
    takeoff(): Observable<DroneControlResponse> {
        let body = new DroneControlRequest("takeoff", 0);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(this._urlControl + '/takeoff', JSON.stringify(body), options)
            .map(res => res.json() || {})
            .catch(this.handleError);
    }

    /**
     * Land at current position.
     */
    land(): Observable<DroneControlResponse> {
        let body = new DroneControlRequest("land", 0);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(this._urlControl + '/land', JSON.stringify(body), options)
            .map(res => res.json() || {})
            .catch(this.handleError);
    }

    /**
     * Yaw rotation speed as signed percentage [-100, 100]. 
     * -100 corresponds to a counter-clockwise rotation of max yaw rotation speed.
     * +100 corresponds to a clockwise rotation of max yaw rotation speed
     */
    yaw(speed: number): Observable<DroneControlResponse> {
        let body = new DroneControlRequest("yaw", speed);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(this._urlControl + '/yaw', JSON.stringify(body), options)
            .map(res => res.json() || {})
            .catch(this.handleError);
    }

    /**
     * Pitch angle as signed percentage [-100, 100].
     * -100 corresponds to a pitch angle of max backward (drone will fly backward).
     * +100 corresponds to a pitch angle of max forward (drone will fly forward).
     */
    pitch(angle: number): Observable<DroneControlResponse> {
        let body = new DroneControlRequest("pitch", angle);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(this._urlControl + '/pitch', JSON.stringify(body), options)
            .map(res => res.json() || {})
            .catch(this.handleError);
    }

    /**
     * Roll angle as signed percentage [-100, 100].
     * -100 corresponds to a roll angle of max to the left (drone will fly left).
     * +100 corresponds to a roll angle of max to the right (drone will fly right)
     */
    roll(angle: number): Observable<DroneControlResponse> {
        let body = new DroneControlRequest("roll", angle);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(this._urlControl + '/roll', JSON.stringify(body), options)
            .map(res => res.json() || {})
            .catch(this.handleError);
    }

    /**
     * Throttle as signed percentage [-100, 100].
     * -100 corresponds to a max vertical speed towards ground.
     * +100 corresponds to a max vertical speed towards sky.
     */
    lift(speed: number): Observable<DroneControlResponse> {
        let body = new DroneControlRequest("lift", speed);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(this._urlControl + '/lift', JSON.stringify(body), options)
            .map(res => res.json() || {})
            .catch(this.handleError);
    }

    /**
     * Stop moving.
     */
    level(): Observable<DroneControlResponse> {
        let body = new DroneControlRequest("level", 0);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(this._urlControl + '/level', JSON.stringify(body), options)
            .map(res => res.json() || {})
            .catch(this.handleError);
    }

    /**
     * Start or restart paused mission.
     */
    startMission(): Observable<DroneControlResponse> {
        let body = new DroneControlRequest("startMission", 0);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(this._urlControl + '/start-mission', JSON.stringify(body), options)
            .map(res => res.json() || {})
            .catch(this.handleError);
    }

    /**
    * Pause mission.
    */
    pauseMission(): Observable<DroneControlResponse> {
        let body = new DroneControlRequest("pauseMission", 0);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(this._urlControl + '/pause-mission', JSON.stringify(body), options)
            .map(res => res.json() || {})
            .catch(this.handleError);
    }

    /**
    * Start or restart paused mission.
    */
    stopMission(): Observable<DroneControlResponse> {
        let body = new DroneControlRequest("stopMission", 0);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(this._urlControl + '/stop-mission', JSON.stringify(body), options)
            .map(res => res.json() || {})
            .catch(this.handleError);
    }

    /**
     * Request to upload the flight plan specified by the passed filename. After successfully uploading the flight plan
     * a 'flightplan' event is emitted.
     * @param name The name of a flight plan.
     */
    uploadFlightplan(name: string): Observable<DroneControlResponse> {
        let body = new DroneControlRequest("uploadFlightplan", name);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(this._urlControl + '/upload-flightplan', JSON.stringify(body), options)
            .map(res => res.json() || {})
            .catch(this.handleError);
    }

    /**
     * Request to retrieve the flight plan from the vehicle.
     * If successful, a 'flightplan' event is triggered delivering a flight plan in case
     * one was previously installed, or an empty flightplan in case no flight plan is installed on
     * the vehicle.
     */
    downloadFlightplan(): Observable<DroneControlResponse> {
        return this.http.get(this._urlControl + '/download-flightplan')
            .map(res => res.json() || {})
            .catch(this.handleError);
    }

    /**
     * Request to delete the flight plan from the vehicle.
     * If successful, a 'flightplan' event is triggered delivering an empty flight plan.
     */
    deleteFlightplan(): Observable<DroneControlResponse> {
        let body = new DroneControlRequest("deleteFlightplan", 0);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(this._urlControl + '/delete-flightplan', JSON.stringify(body), options)
            .map(res => res.json() || {})
            .catch(this.handleError);
    }

    // ======================================================================================================

    testGetRequest(): void {
        this.http.get('http://localhost:4000/testGetRequest')
            .map(res => res.text())
            .subscribe(
            data => { console.log('testGetRequest data: '); console.log(data); },
            err => this.logError(err),
            () => console.log('Test Get reply complete.')
            );
    }

    // ======================================================================================================

    private createHotObservable<T>(eventName: string): ConnectableObservable<T> {
        let connectableObs = Observable.create((observer) => {
            this._socket.on(eventName, (data) => {
                observer.next(data);
            });
            return () => { };
        }).publish();
        connectableObs.connect();
        return connectableObs;
    }

    private handleError(error: Response | any) {
        let errMsg: string;
        if (error instanceof Response) {
            const body = error.json() || '';
            const err = body.message || body.error || JSON.stringify(body);
            if (error.status !== 0) {
                errMsg = `${err} ${error.statusText || ''} (${error.status})`;
            }
            else {
                errMsg = 'Connection failed';
            }
        } else {
            errMsg = error.message ? error.message : error.toString();
        }
        console.error(errMsg);
        return Observable.throw(errMsg);
    }

    logError(err) {
        console.error('There was an error: ' + err);
    }

}
