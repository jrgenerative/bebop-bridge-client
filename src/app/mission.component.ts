import { Component, ViewChild, ElementRef } from '@angular/core';
import { OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ControlService } from './control.service';
import { Message } from 'primeng/primeng';
import { DropdownModule } from 'primeng/primeng';
import { SelectItem } from 'primeng/primeng';
import { FileUploadModule } from 'primeng/primeng';
import { FlightplanService } from 'bebop-bridge-shared';
import { FlightplanServiceRemote } from './flightplan.service.remote';
import { Flightplan, Waypoint } from 'bebop-bridge-shared';
import { ConnectableObservable } from 'rxjs/observable/ConnectableObservable';
let geolib = require('geolib');

@Component({
    selector: 'drone-mission',
    templateUrl: 'mission.component.html',
    styleUrls: ['app.scss', '../../node_modules/font-awesome/scss/font-awesome.scss'],
    host: { '(window:keydown)': 'hotkeys($event)' }
})
export class MissionComponent implements OnInit {

    @ViewChild('flightplanFileDialog') flightplanFileDialogElement: ElementRef; // https://angular.io/docs/js/latest/api/core/index/ElementRef-class.html

    private _loadFlightplanLabel: string = 'Load Mavlink file';
    private _flightplans: SelectItem[] = [];
    private _selectedFlightplan: string = '';
    private _msgs: Message[] = [];
    private _enableUpload: boolean = false;
    private _obsDistanceToTakeoff: ConnectableObservable<number> = null;

    constructor(
        private controlService: ControlService,
        private flightplanService: FlightplanServiceRemote) {

        // Distance to flightplan takeoff location
        this._obsDistanceToTakeoff = Observable.combineLatest(controlService.position, controlService.flightplan, (pos, flightplan: Flightplan) => {
            if (flightplan.isValid && pos.latitude && pos.longitude) {
                let wp = new Waypoint(pos.latitude, pos.longitude, flightplan.takeOffPosition.altitude, 0, 0);
                return Math.floor(geolib.getDistance(wp, flightplan.takeOffPosition));
            }
            else {
                return -1;
            }
        }).publish();
        this._obsDistanceToTakeoff.connect();
    }

    ngOnInit(): void {

        // Load flight plan list manually at start-up
        this.flightplanService.getFlightplanList().subscribe(
            (response: string[]) => {
                this.updateFlightplanList(response);
            },
            (err: string) => {
                console.error(err);
                this.showError(err);
            },
            () => { }
        );

        // Register for flight plan list updates
        this.flightplanService.flightplanList().subscribe(
            (names: string[]) => {
                this.updateFlightplanList(names);
            },
            (err: string) => {
                console.error('Flight plan list sequence terminated. ' + err);
                this.showError(err);
            },
            () => {
                console.error('Flight plan list sequence terminated.');
            }
        );
    }

    startMission(): void {
        this.controlService.startMission().subscribe(
            response => console.log(response.message),
            err => this.showError(err),
            () => { }
        );
    }

    pauseMission(): void {
        this.controlService.pauseMission().subscribe(
            response => console.log(response.message),
            err => this.showError(err),
            () => { }
        );
    }

    stopMission(): void {
        this.controlService.stopMission().subscribe(
            response => console.log(response.message),
            err => this.showError(err),
            () => { }
        );
    }

    uploadFlightplan(name: string): void {
        if (this._selectedFlightplan !== '') {
            this.controlService.uploadFlightplan(name).subscribe(
                response => console.log(response.message),
                err => this.showError(err),
                () => { }
            );
        }
        else {
            this.showError('No flight plan selected');
        }
    }

    // Add flight plan functionality ====================================

    addFlightplanFile(inputElement: HTMLInputElement): void {
        // (don't need to use inputElement)
        this.readFlightplanFile(this.flightplanFileDialogElement.nativeElement).subscribe(
            (flightplan: Flightplan) => {
                this.flightplanService.saveFlightplan(flightplan).subscribe(
                    (nothing: void) => {
                        console.log('Flight plan stored');
                        this.showInfo('Flight plan stored');
                    },
                    (error: string) => {
                        console.error(error);
                        this.showError(error);
                    },
                    () => { }
                );
            },
            (error) => {
                console.log(error);
                this.showError(error);
            },
            () => { }
        );
    }

    readFlightplanFile(inputElement: HTMLInputElement): Observable<Flightplan> {
        return Observable.create((observer) => {
            if (this.isValidFlightplanFileElement(inputElement)) {
                let reader: FileReader = new FileReader();
                reader.onload = (e) => {
                    try {
                        let content: string = reader.result;
                        let fp = new Flightplan(content);
                        this.resetInputFileElement(this.flightplanFileDialogElement.nativeElement, this._loadFlightplanLabel);
                        observer.next(fp);
                        observer.complete();
                    }
                    catch (err) {
                        this.resetInputFileElement(this.flightplanFileDialogElement.nativeElement, this._loadFlightplanLabel);
                        let msg: string = 'Could not parse flight plan. ' + err.message;
                        console.error(msg);
                        observer.error(msg);
                    }
                };
                reader.onerror = (err) => {
                    this.resetInputFileElement(this.flightplanFileDialogElement.nativeElement, this._loadFlightplanLabel);
                    let msg: string = 'FileReader error. ' + err.message;
                    console.error(msg);
                    observer.error(msg);
                };
                reader.readAsText(inputElement.files[0]);
            }
            else {
                this.resetInputFileElement(this.flightplanFileDialogElement.nativeElement, this._loadFlightplanLabel);
                observer.error("No valid file has been selected.");
            }
        });
    }

    isValidFlightplanFileElement(inputElement: HTMLInputElement) {
        return !!(inputElement && inputElement.files && inputElement.files[0]); // && inputElement.files[0].name.endsWith('.mavlink') === true);
    }

    flightplanFileToUploadIsInvalid(): boolean {
        return !this._enableUpload;
    }

    resetInputFileElement(inputElement: HTMLInputElement, labelText: string) {
        if (inputElement) {
            inputElement.value = "";
            if (inputElement.nextElementSibling) {
                inputElement.nextElementSibling.innerHTML = labelText;
            }
        }
    }

    // ===============================

    deleteFlightplanFromLibrary(name: string) {
        if (this._selectedFlightplan !== '') {
            this.flightplanService.deleteFlightplan(name).subscribe(
                (nothing: void) => {
                    console.log('Flight plan deleted');
                    this.showInfo('Flight plan deleted');
                },
                (err: string) => {
                    console.error(err);
                    this.showError(err);
                },
                () => { }
            );
        }
        else {
            this.showError('No flight plan selected');
        }
    }

    updateFlightplanList(names: string[]): void {
        this._selectedFlightplan = '';
        this._flightplans = [];
        this._flightplans.push({ label: 'empty selection', value: '' });
        names.forEach((fpname) => {
            this._flightplans.push({ label: fpname, value: fpname });
        });
    }

    checkFlightplan(): void {
        // trigger a 'flightplan' event
        this.controlService.downloadFlightplan().subscribe(
            response => console.log(response.message),
            err => this.showError(err),
            () => { }
        );
    }

    deleteFlightplan(): void {
        this.controlService.deleteFlightplan().subscribe(
            response => console.log(response.message),
            err => this.showError(err),
            () => { }
        );
    }

    hotkeys(event) {

        // ALT + k
        if (event.keyCode === 75 && event.altKey) {
            this.pauseMission();
        }
        // ALT + i
        else if (event.keyCode === 73 && event.altKey) {
            this.startMission();
        }
        // ALT + ,
        else if (event.keyCode === 188 && event.altKey) {
            this.stopMission();
        }
        else {
            console.log('no action assigned to key: ' + event.keyCode);
        }
    }

    private showError(message: string): void {
        this._msgs = [];
        this._msgs.push({ severity: 'error', summary: 'Error', detail: message });
    }

    private showInfo(message: string): void {
        this._msgs = [];
        this._msgs.push({ severity: 'success', summary: 'Success', detail: message });
    }

}