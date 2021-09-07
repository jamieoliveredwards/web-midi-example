import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { interval, Observable, of, combineLatest } from 'rxjs';
import { filter, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';

// Tensorflow
import * as handpose from '@tensorflow-models/handpose';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-converter';
// import '@tensorflow/tfjs-backend-cpu';
// import * as facialLandmarks from '@tensorflow-models/face-landmarks-detection';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  @ViewChild('video') private videoElement!: ElementRef<HTMLVideoElement>;

  private handpose$ = this.initialiseHandpose();
  public predictions$ = combineLatest([this.handpose$, interval(50)]).pipe(
    switchMap(([model]) => this.videoElement ? this.estimateHands(model, this.videoElement.nativeElement) : null),
    filter(value => !!value),
    map(value => {
      const min = Math.min(
        value.boundingBox.bottomRight[0],
        value.boundingBox.bottomRight[1],
        value.boundingBox.topLeft[0],
        value.boundingBox.topLeft[1]
      );
      const max = Math.max(
        value.boundingBox.bottomRight[0],
        value.boundingBox.bottomRight[1],
        value.boundingBox.topLeft[0],
        value.boundingBox.topLeft[1]
      );
      return Math.max(Math.min(Math.max(Math.floor(max - min) - 200), 400) / 4, 0);
    })
  );

  public controlsForm = this.fb.group({
    x: [60]
  });

  public midiAccess$ = this.midiAccess({
    sysex: true
  });
  public midiSend$ = this.predictions$.pipe(
    withLatestFrom(this.midiAccess$),
    filter(([_, midi]) => !!midi),
    tap(([value, midi]) => {
      midi.outputs.forEach(output => {
        const val = value * 1.27;
        const message = new Uint8Array([0xB0, 1, val]);
        output?.send(message);
      });
    })
  );
  public videoStream$: Observable<MediaStream | null> = this.requestVideoAccess();

  constructor(
    private fb: FormBuilder
  ) { }

  private midiAccess(options?: WebMidi.MIDIOptions): Observable<WebMidi.MIDIAccess> {
    return new Observable(observer => {
      navigator.requestMIDIAccess(options)
        .then(midiAccess => {
          observer.next(midiAccess);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
          observer.complete();
        });
    });
  }

  private requestVideoAccess(): Observable<MediaStream> {
    return new Observable(observer => {
      navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      }).then(mediaStream => {
        observer.next(mediaStream);
        observer.complete();
      }).catch(err => {
        observer.error(err);
        observer.complete();
      });
    })
  }

  private initialiseHandpose(): Observable<handpose.HandPose> {
    return new Observable(observer => {
      handpose.load({})
        .then(model => {
          observer.next(model);
          observer.complete();
        })
        .catch(err => observer.error(err));
    });
  }

  private estimateHands(model: handpose.HandPose, videoElement: HTMLVideoElement): Observable<handpose.AnnotatedPrediction> {
    return new Observable(observer => {
      model.estimateHands(videoElement)
        .then(estimation => observer.next(estimation ? estimation[0] : null))
        .catch(err => observer.error(err))
    });
  }

  closeVideo(mediaStream: MediaStream) {
    mediaStream.getTracks().forEach(track => mediaStream.removeTrack(track));
    this.videoStream$ = of(null);
  }

}
