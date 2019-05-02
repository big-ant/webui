import { Container, Texture, Sprite } from 'pixi.js';
import { OutlineFilter } from '@pixi/filter-outline';
import { AdvancedBloomFilter } from '@pixi/filter-advanced-bloom';
import { Subject, Observable } from 'rxjs';
import { CoreEvent } from 'app/core/services/core.service';
import { LabelFactory } from './label-factory';
import { Chassis } from './chassis';
import { DriveTray } from './drivetray';
import * as d3 from 'd3';
import {
  tween,
  styler,
  listen,
  pointer,
  value,
  decay,
  spring,
  physics,
  easing,
  everyFrame,
  keyframes,
  timeline,
  //velocity,
  multicast,
  action,
  transform,
  //transformMap,
  //clamp
  } from 'popmotion';

interface Position {
  x: number;
  y: number;
}

export class VDevLabelsSVG {

 /*
  * We create an SVG layer on top of the PIXI canvas 
  * to achieve crisper lines. Apparently drawing 
  * thin lines in WebGL is problematic without
  * resorting to caching them as bitmaps which 
  * essentially renders them static.
  * 
  */

  public events: Subject<CoreEvent>;

  protected svg:any; // Our d3 generated svg layer
  protected mainStage: any; // WebGL Canvas
  protected app: any;
  protected chassis: Chassis; // The chassis we are labelling
  //public container: Container;
  //protected domLabels: any;
  public color: string;
  public ClickByProxy;
  
  private textAreas: any;
  private trays: any = {};

  constructor(chassis, app, color){
    //super(chassis, stage)

    this.color = color;
    this.onInit(chassis, app);
  }

  onInit(chassis, app){
    this.chassis = chassis;
    this.app = app;
    this.mainStage = this.app.stage;
    this.d3Init();

    //this.defineTextAreas();

    this.events = new Subject<CoreEvent>();
    this.events.subscribe((evt:CoreEvent) => {
      switch(evt.name){
        case "LabelDrives":
          //console.log(evt);
          this.createVdevLabels(evt.data);
          break
        case "OverlayReady":
          //console.log(evt);
          this.traceElements(evt.data.vdev, evt.data.overlay);
          break
      }
    });

  }

  onDestroy(){
    console.log("Clean up after yourself");
  }

  // Animate into view
  enter(){
    console.log("Animate into view...");
  }

  // Animate out of view
  exit(){

    let op = this.getParent();
    d3.select('#' + op.id + ' svg').remove();
    d3.select('#' + op.id + ' canvas.clickpad').remove();
    this.app.renderer.plugins.interaction.setTargetElement(this.app.renderer.view);
    
    this.events.next({name:"LabelsDestroyed"});
  }

  d3Init(){
    let op = this.getParent();

    this.svg = d3.select('#' + op.id).append("svg")
      .attr("width", op.offsetWidth)
      .attr("height", op.offsetHeight)
      .attr("style", "position:absolute;");

    let clickpad = d3.select('#' + op.id).append("canvas") // This element will capture for PIXI
      .attr('class', 'clickpad')
      .attr("width", op.offsetWidth)
      .attr("height", op.offsetHeight)
      .attr("style", "position:absolute;");

    this.app.renderer.plugins.interaction.setTargetElement(op.querySelector('canvas.clickpad'));

  }

  getParent(){
    return this.app.renderer.view.offsetParent
  }

  createVdevLabelTile(x,y,w,h, className){
    
    this.svg.append("rect")
      .attr('class', className)
      .attr("y", y)
      .attr("x", x)
      .attr("width", w)
      .attr("height", h)
      .attr("fill", this.color)
      .attr("stroke",this.color)
      .attr("style", "fill-opacity:0.25; stroke-width:1");
  }


  createVdevLabels(vdev){

    let disks = Object.keys(vdev.disks);// NOTE: vdev.slots only has values for current enclosure
    let xOffset = this.chassis.container.x + this.chassis.container.width + 16;
    let freeSpace = this.app._options.width - xOffset;
    let gap = 3;
      
    
    // Simulate disks that live on another enclosure
    /*for(let i = 10; i < 21; i++){
      disks.push('ada' + i);
    }*/
    

    disks.forEach((disk, index) => {
      let present = false; // Is the disk in this enclosure?
      if(typeof vdev.slots[disk] !== 'undefined'){

        present = true;
        // Create tile if the disk is in the current enclosure
        let src = this.chassis.driveTrayObjects[vdev.slots[disk]].container;
        let tray = src.getGlobalPosition();

        let tileClass = "tile tile_" + disk;
        this.createVdevLabelTile(tray.x, tray.y, src.width * this.chassis.container.scale.x, src.height * this.chassis.container.scale.y, tileClass);
        this.trays[ disk ] = {x: tray.x, y: tray.y, width: src.width * this.chassis.container.scale.x, height: src.height * this.chassis.container.scale.y};
      }
    });

  }

  traceElements(vdev, overlay){
    let disks = Object.keys(vdev.disks);// NOTE: vdev.slots only has values for current enclosure
    let op = this.getParent();// Parent div
    disks.forEach((disk, index) => {
      
      let present = false; // Is the disk in this enclosure?
      if(typeof vdev.slots[disk] !== 'undefined'){
        present = true;
        // Create tile if the disk is in the current enclosure

        let tray = this.trays[disk];
        
        let el = overlay.nativeElement.querySelector('div.vdev-disk.' + disk);
        let startX = tray.x + tray.width;
        let startY = tray.y + tray.height / 2;
        let endX = el.offsetLeft + el.offsetParent.offsetLeft;
        let endY = el.offsetTop + el.offsetParent.offsetTop + (el.offsetHeight / 2);
        this.createTrace(startX, startY, endX, endY);
      }
    });
  }

  createTrace(startX,startY, endX, endY){
  
    let svgPath = "M" + startX + " " + startY + " L" + endX + " " + endY + " Z"

    this.svg.append("path")
      .attr('d', svgPath)
      .attr('stroke', this.color)

  }


  protected parseColor(color:string){
    return parseInt("0x" + color.substring(1), 16)
  }

}
