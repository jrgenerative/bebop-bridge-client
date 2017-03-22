import { Component } from '@angular/core';
import { OnInit } from '@angular/core';
import './rxjs-operators'; // Add the RxJS Observable operators we need in this app.
import { Message } from 'primeng/primeng';
import { ControlService } from './control.service';
import { ConnectionQualityProgressCircleConvert, BooleanToRedGreenColor, LastContactTimeToTrafficLightColor } from './custom-pipes';

@Component({
    selector: 'drone-dashboard',
    templateUrl: 'dashboard.component.html',
    styleUrls: ['app.scss']
})
export class DashboardComponent implements OnInit {

    public value: number = 50;
    private msgs: Message[] = [];

    constructor(
        private controlService: ControlService
    ) {
        // Subscribe to error messages
        this.controlService.error.subscribe(
            (message) => this.showError(message),
            (errMsg) => this.showError(errMsg),
            () => { }
        );

        // Subscribe to success messages
        this.controlService.success.subscribe(
            (message) => this.showInfo(message),
            (errMsg) => this.showError(errMsg),
            () => { }
        );

        // Subscribe to connected message
        this.controlService.connected.subscribe(
            (isConnected) => {
                if (isConnected) {
                    this.showInfo('Connected');
                }
                else {
                    this.showError('Failed to connect');
                }
            },
            (errMsg) => this.showInfo(errMsg),
            () => { }
        );
    }

    ngOnInit(): void {
    }

    private showError(message: string): void {
        this.msgs = [];
        this.msgs.push({ severity: 'error', summary: 'Error', detail: message });
    }

    private showInfo(message: string): void {
        this.msgs = [];
        this.msgs.push({ severity: 'success', summary: 'Success', detail: message });
    }

}