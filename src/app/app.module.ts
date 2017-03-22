import { NgModule } from '@angular/core';
import { ApplicationRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpModule, JsonpModule } from '@angular/http';
import { GrowlModule } from 'primeng/primeng';
import { AccordionModule } from 'primeng/primeng';
import { FileUploadModule } from 'primeng/primeng';

import { ControlComponent } from './control.component';
import { MissionComponent } from './mission.component';
import { ControlService } from './control.service';
import { FlightplanServiceRemote } from './flightplan.service.remote';
import { FlightplanService } from 'bebop-bridge-shared';
import { DashboardComponent } from './dashboard.component';
import { MapComponent } from './map.component';
import { ConnectionQualityProgressCircleConvert, BooleanToRedGreenColor, LastContactTimeToTrafficLightColor, FlightplanNameToDisplayName } from './custom-pipes';

import { ProgressBarModule } from 'primeng/primeng';
import { DropdownModule } from 'primeng/primeng';

import { AppComponent } from './app.component';

import { AgmCoreModule } from 'angular2-google-maps/core';

@NgModule({
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    HttpModule,
    JsonpModule,
    GrowlModule,
    AccordionModule,
    ProgressBarModule,
    DropdownModule,
    FileUploadModule
  ],
  declarations: [AppComponent,
    ControlComponent,
    MissionComponent,
    DashboardComponent,
    MapComponent,
    ConnectionQualityProgressCircleConvert,
    BooleanToRedGreenColor,
    LastContactTimeToTrafficLightColor,
    FlightplanNameToDisplayName],
  bootstrap: [AppComponent],
  providers: [
    ControlService,
    FlightplanServiceRemote
  ]
})
export class AppModule { }