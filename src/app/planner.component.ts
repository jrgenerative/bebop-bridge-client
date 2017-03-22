// import { Component } from '@angular/core';
// import { OnInit } from '@angular/core';
// import { Router } from '@angular/router';
// import { LatLng } from 'angular2-google-maps/core';
// import { MouseEvent } from 'angular2-google-maps/core';
// import { PolyMouseEvent } from 'angular2-google-maps/core';

// @Component({
//     selector: 'drone-planner',
//     templateUrl: 'planner.component.html',
//     styleUrls: ['app.scss']
// })
// export class PlannerComponent implements OnInit {

//     constructor(
//         private router: Router) {
//     }

//     lat: number = 47.475292;
//     lng: number = 8.288831;

//     latA: number = 47.47590;
//     lngA: number = 8.288840;

//     latB: number = 47.47580;
//     lngB: number = 8.278850;

//     contour: Polyline = null;

//     polylineAddMode: boolean = false;

//     ngOnInit(): void {
//         // nothing
//     }

//     lineDragEnd($event: MouseEvent): void {
//         console.log('dragEnd', $event);
//     }

//     lineDragStart($event: MouseEvent): void {
//         console.log('dragStart', $event);
//     }

//     lineMouseDown($event: PolyMouseEvent): void {
//         console.log('mouseDown', $event);
//     }

//     addPolyline(): void {
//         this.polylineAddMode = true;
//         this.contour = new Polyline(); // discard old contour if exists.
//     }

//     circleClick(point: Coordinate, $event: MouseEvent): void {
//         console.log('circleClick: point', point);
//     }

//     mapClick($event: MouseEvent): void {
//         //console.log('mapClick', $event.coords);
//         if (this.polylineAddMode) {
//             this.contour.points.push(new Coordinate($event.coords.lat, $event.coords.lng));
//         }
//     }

//     mapRightClick($event: MouseEvent): void {
//         //console.log('mapDblClick', $event.coords);
//         if (this.polylineAddMode) {
//             this.polylineAddMode = false;
//         }
//     }


// }

// /**
//  * A coordinate on the map.
//  */
// class Coordinate {
//     constructor(private lat: number, private lng: number) {
//     }
// }

// /**
//  * A polyline 
//  */
// class Polyline {

//     contructor() {
//     }

//     addPoint(point: Coordinate) {
//         this.points.push(point);
//     }

//     points: Coordinate[] = [];
// }
