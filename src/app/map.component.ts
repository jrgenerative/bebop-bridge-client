import { Component } from '@angular/core';
import { OnInit } from '@angular/core';
import './rxjs-operators'; // Add the RxJS Observable operators we need in this app.
import { Message } from 'primeng/primeng';
import { ControlService, PositionData } from './control.service';
import { ConnectionQualityProgressCircleConvert, BooleanToRedGreenColor, LastContactTimeToTrafficLightColor } from './custom-pipes';
import * as leaflet from "leaflet";
import { Flightplan, Waypoint } from 'bebop-bridge-shared';

interface LayerItem {
    name: string;
    value: leaflet.TileLayer;
}

@Component({
    selector: 'drone-map',
    templateUrl: 'map.component.html',
    styleUrls: ['app.scss']
})
export class MapComponent implements OnInit {

    private msgs: Message[] = [];
    private _map: leaflet.Map = null;
    private _mapLayers: LayerItem[] = [];
    private _bebopMarker: any = null;
    private _flightplan: Flightplan = new Flightplan();
    private _flightplanPolyline: leaflet.Polyline = null;
    private _vehiclePosition: PositionData = new PositionData();

    constructor(
        private controlService: ControlService
    ) {
    }

    ngOnInit(): void {

        // Catch errors from flightplan
        this._flightplan.on('error', (err) => {
            this.showError(err.message);
        });

        this._flightplan.on('success', (message) => {
            this.showInfo(message);
        });

        // Create a Bebop icon
        let icon = leaflet.icon({
            iconUrl: 'assets/img/quad.png',
            // shadowUrl: './quad.jpg',
            iconSize: [38, 38], // size of the icon
            iconAnchor: [19, 19], // point of the icon which will correspond to marker's location
            popupAnchor: [-3, -76] // point from which the popup should open relative to the iconAnchor
        });

        // Create a map instance
        this._map = leaflet.map('mapid').setView([47.468722, 8.274975], 13);


        // Google map imagery layer
        this._mapLayers.push({
            name: 'Google',
            value: leaflet.tileLayer(
                'http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                    maxZoom: 21,
                    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
                })
        });

        // Agis map imagery layer
        this._mapLayers.push({
            name: 'Agis',
            value: leaflet.tileLayer(
                'http://mapproxy.osm.ch:8080/tiles/AGIS2014/EPSG900913/{z}/{x}/{y}.png?origin=nw', { // http://mapproxy.osm.ch/demo -> 2014
                    //private _mapSource: string = 'http://mapproxy.osm.ch:8080/tiles/AGIS2016/EPSG900913/{z}/{x}/{y}.png?origin=nw'; // http://mapproxy.osm.ch/demo -> 2016
                    maxZoom: 18,
                    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                    'Imagery © <a href="http://mapbox.com">Mapbox</a>',
                    id: 'mapbox.streets'
                })
        });

        // Use the first array entry as the default map
        this._mapLayers[0].value.addTo(this._map);

        // Add the bebop marker

        // Subscribe to bebop position event/observable
        this.controlService.position.subscribe(
            pos => {
                this._vehiclePosition.latitude = pos.latitude;
                this._vehiclePosition.longitude = pos.longitude;
                this._vehiclePosition.altitude = pos.altitude;
                // If we get a valid position
                if (this._vehiclePosition.isValid) {
                    // Add vehicle position marker if has not been added so far.
                    if (this._bebopMarker === null) {
                        this._bebopMarker = leaflet.marker([pos.latitude, pos.longitude], { icon: icon }).addTo(this._map);
                    }
                    // Update vehicle marker position
                    this._bebopMarker.setLatLng(leaflet.latLng(pos.latitude, pos.longitude, 0.0));
                    this._bebopMarker.update();
                }
            },
            err => {
                this.showError('Failed to retrieve vehicle position: ' + err);
            },
            () => { }
        );

        // Subscribe to bebop flightplan event/observable
        this.controlService.flightplan.subscribe(
            fp => {
                this.drawFlightplan(fp, this._map);
            },
            err => {
                this.showError('Failed to retrieve flight plan: ' + err);
            },
            () => { }
        );
    }

    private panToDrone(): void {
        try {
            if (this._vehiclePosition.isValid) {
                this._map.panTo(leaflet.latLng(this._vehiclePosition.latitude, this._vehiclePosition.longitude));
            }
        }
        catch (err) {
            console.log(err);
            this.showError(err);
        }
    }

    // private panToFlightplan(): void {
    //     console.log('pan!');
    //     try {
            
    //     }
    //     catch (err) {
    //         console.log(err);
    //         this.showError(err);
    //     }
    // }

    private drawFlightplan(flightplan: Flightplan, map: leaflet.Map): void {

        // Remove any previous flightplan drawing from the map.
        if (this._flightplanPolyline) {
            this._flightplanPolyline.remove();
            this._flightplanPolyline = null;
        }

        // Render new flight plan if a valid one was passed.
        if (flightplan && flightplan.isValid) {

            // Create array of LatLng from flightplan waypoints
            let lla: leaflet.LatLng[] = [];

            // Take-off position
            lla.push(leaflet.latLng(flightplan.takeOffPosition.latitude, flightplan.takeOffPosition.longitude, 0));

            // waypoints
            flightplan.waypoints.forEach(wp => {
                lla.push(leaflet.latLng(wp.latitude, wp.longitude, 0));
            });

            // Touchdown position
            lla.push(leaflet.latLng(flightplan.touchDownPosition.latitude, flightplan.touchDownPosition.longitude, 0));

            // Add the polyline to the map
            this._flightplanPolyline = leaflet.polyline(lla, { color: "red", lineJoin: "round", lineCap: "butt" }).addTo(this._map);

            // Center map on take-off
            this._map.panTo(leaflet.latLng(flightplan.takeOffPosition.latitude, flightplan.takeOffPosition.longitude));
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

    // private drawPath(latlngs, showMarkers = true, heights = null, pathColor = "red") {

    //     // create a red polyline from an array of LatLng points
    //     let polyline = L.polyline(latlngs, { color: "red", lineJoin: "round", lineCap: "butt" }).addTo(this._map);

    //     // if (showMarkers) {
    //     // var greenDotIcon = L.icon({
    //     //     iconUrl: 'green_dot.png',
    //     //     iconSize: [16, 16], // size of the icon
    //     //     iconAnchor: [8, 8], // point of the icon which will correspond to marker's location
    //     //     popupAnchor: [-300, -76] // point from which the popup should open relative to the iconAnchor
    //     // });

    //     // for (i = 0; i < latlngs.length; i++) {
    //     //     var marker = leaflet.marker(latlngs[i], { opacity: 1, icon: greenDotIcon }); //opacity may be set to zero
    //     //     if (heights)
    //     //         marker.bindTooltip(String(heights[i]), { permanent: false, className: "my-label", offset: [0, 0] });
    //     //     marker.addTo(this._map);
    //     // }
    //     // }
    // }

}


