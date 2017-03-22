import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import * as io from "socket.io-client";
import { Observable } from 'rxjs/Observable';
import { ConnectableObservable } from 'rxjs/observable/ConnectableObservable';
import { Flightplan, FlightplanService } from 'bebop-bridge-shared';

/**
 * Client-side flight plan service implementation.
 */
@Injectable()
export class FlightplanServiceRemote implements FlightplanService {

    private _urlControl = 'http://' + window.location.hostname + ':' + process.env.API_PORT + '/bridge'; // 'http://localhost:4000/control';  // URL to drone control service
    private _urlDownlink = 'http://' + window.location.hostname + ':' + process.env.API_PORT + '/bridge/downlink'; // 'http://localhost:4000/downlink'; // URL on which socket.io sends drone data

    private _socket: SocketIOClient.Socket = null; // socket for downlink messages

    private _obsError: ConnectableObservable<string> = null;
    private _obsFlightplanList: ConnectableObservable<string[]> = null;

    constructor(private http: Http) {
        this._socket = io(this._urlDownlink);
        this._obsFlightplanList = this.createHotObservableForSocketEvent<string[]>('flightplan-list', 'flightplan-list-error');
    }

    public flightplanList(): Observable<string[]> {
        return this._obsFlightplanList;
    }

    public getFlightplanList(): Observable<string[]> {
        return this.http.get(this._urlControl + '/list-flightplans')
            .map(res => res.json() || {})
            .catch(this.handleError);
    }

    public loadFlightplan(name: string): Observable<Flightplan> {
        return Observable.create((observer) => {
            observer.error('Not implemented');
        });
    }

    public saveFlightplan(flightplan: Flightplan): Observable<void> {
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(this._urlControl + '/save-flightplan', JSON.stringify(flightplan), options)
            .catch(this.handleError);
    }

    public deleteFlightplan(name: string): Observable<void> {
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(this._urlControl + '/delete-flightplan', { 'name': name }, options)
            .catch(this.handleError);
    }

    // ======================================================================================================

    /**
     * Create a published and connected observable which provides data received from the socket
     * of this service.
     * @param dataEventName the name of the event to listen to.
     * @param errorEventName the name of the event which delivers errors for this observable.
     */
    private createHotObservableForSocketEvent<T>(dataEventName: string, errorEventName: string): ConnectableObservable<T> {
        let connectableObs = Observable.create((observer) => {
            this._socket.on(dataEventName, (data) => {
                observer.next(data);
            });
            this._socket.on(errorEventName, (msg: string) => {
                observer.error(msg);
            });
            return () => { };
        }).publish();
        connectableObs.connect();
        return connectableObs;
    }

    /**
     * Handle http request errors.
     * Return an observable which immediately triggers error.
     */
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
}
