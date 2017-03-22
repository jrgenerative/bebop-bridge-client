import { Component } from '@angular/core';
import { OnInit } from '@angular/core';
import { ControlService } from './control.service';
import { Message } from 'primeng/primeng';

@Component({
  selector: 'drone-control',
  templateUrl: 'control.component.html',
  styleUrls: ['app.scss', '../../node_modules/font-awesome/scss/font-awesome.scss'],
  host: { '(window:keydown)': 'hotkeys($event)' }
})
export class ControlComponent implements OnInit {

  private _yaw: number;
  private _pitch: number;
  private _roll: number;
  private _lift: number;

  private _yawMax: number = 100;
  private _yawMin: number = -100;
  private _pitchMax: number = 100;
  private _pitchMin: number = -100;
  private _rollMax: number = 100;
  private _rollMin: number = -100;
  private _liftMax: number = 100;
  private _liftMin: number = -100;

  private msgs: Message[] = [];

  constructor(
    private controlService: ControlService) {
    this.resetLocomotionState();
  }

  ngOnInit(): void {
    this.connect();
  }

  resetLocomotionState() {
    this._yaw = 0.0;
    this._pitch = 0.0;
    this._roll = 0.0;
    this._lift = 0.0;
  }

  connect(): void {
    this.resetLocomotionState();
    this.controlService.connect().subscribe(
      response => console.log(response.message),
      errMsg => this.showError(errMsg),
      () => { }
    );
  }

  takeoff(): void {
    this.resetLocomotionState();
    this.controlService.takeoff().subscribe(
      response => console.log(response.message),
      errMsg => this.showError(errMsg),
      () => { }
    );
  }

  land(): void {
    this.resetLocomotionState();
    this.controlService.land().subscribe(
      response => console.log(response.message),
      errMsg => this.showError(errMsg),
      () => { }
    );
  }

  yawLeft(): void {
    this._yaw -= 10;
    if (this._yaw < this._yawMin) {
      this._yaw = this._yawMin;
    }
    this.controlService.yaw(this._yaw).subscribe(
      response => console.log(response.message),
      errMsg => this.showError(errMsg),
      () => { }
    );
  }

  yawRight(): void {
    this._yaw += 10;
    if (this._yaw > this._yawMax) {
      this._yaw = this._yawMax;
    }
    this.controlService.yaw(this._yaw).subscribe(
      response => console.log(response.message),
      errMsg => this.showError(errMsg),
      () => { }
    );
  }

  moveForward(): void {
    this._pitch += 10;
    if (this._pitch > this._pitchMax) {
      this._pitch = this._pitchMax;
    }
    this.controlService.pitch(this._pitch).subscribe(
      response => console.log(response.message),
      errMsg => this.showError(errMsg),
      () => { }
    );
  }

  moveBackward(): void {
    this._pitch -= 10;
    if (this._pitch < this._pitchMin) {
      this._pitch = this._pitchMin;
    }
    this.controlService.pitch(this._pitch).subscribe(
      response => console.log(response.message),
      errMsg => this.showError(errMsg),
      () => { }
    );
  }

  moveUp(): void {
    this._lift += 10;
    if (this._lift > this._liftMax) {
      this._lift = this._liftMax;
    }
    this.controlService.lift(this._lift).subscribe(
      response => console.log(response.message),
      errMsg => this.showError(errMsg),
      () => { }
    );
  }

  moveDown(): void {
    this._lift -= 10;
    if (this._lift < this._liftMin) {
      this._lift = this._liftMin;
    }
    this.controlService.lift(this._lift).subscribe(
      response => console.log(response.message),
      errMsg => this.showError(errMsg),
      () => { }
    );
  }

  moveRight(): void {
    this._roll += 10;
    if (this._roll > this._rollMax) {
      this._roll = this._rollMax;
    }
    this.controlService.roll(this._roll).subscribe(
      response => console.log(response.message),
      errMsg => this.showError(errMsg),
      () => { }
    );
  }

  moveLeft(): void {
    this._roll -= 10;
    if (this._roll < this._rollMin) {
      this._roll = this._rollMin;
    }
    this.controlService.roll(this._roll).subscribe(
      response => console.log(response.message),
      errMsg => this.showError(errMsg),
      () => { }
    );
  }

  stopMoving(): void {
    this.resetLocomotionState();
    this.controlService.level().subscribe(
      response => console.log(response.message),
      errMsg => this.showError(errMsg),
      () => { }
    );
  }


  testGetRequest(): void {
    this.controlService.testGetRequest();
  }

  hotkeys(event) {

    // ALT + t
    if (event.keyCode === 84 && event.altKey) {
      this.takeoff();
    }
    // ALT + c
    else if (event.keyCode === 67 && event.altKey) {
      this.land();
    }
    else {
      switch (event.keyCode) {
        case 85: // 'u'
          this.yawLeft();
          break;
        case 73: // 'i'
          this.moveForward();
          break;
        case 79: // 'o'
          this.yawRight();
          break;
        case 74: // 'j'
          this.moveLeft();
          break;
        case 75: // 'k'
          this.stopMoving();
          break;
        case 32: // 'space'
          this.stopMoving();
          break;
        case 76: // 'l'
          this.moveRight();
          break;
        case 77: // 'm'
          this.moveDown();
          break;
        case 188: // ','
          this.moveBackward();
          break;
        case 190: // '.'
          this.moveUp();
          break;
        default:
          console.log('no action assigned to key: ' + event.keyCode);
      }
    }
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