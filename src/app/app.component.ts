import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { filter, tap, withLatestFrom } from 'rxjs/operators';

// Tensorflow

// import '@tensorflow/tfjs-backend-webgl';
// import '@tensorflow/tfjs-backend-cpu';
// import * as facialLandmarks from '@tensorflow-models/face-landmarks-detection';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  public controlsForm = this.fb.group({
    x: [60]
  });

  public midiAccess$ = this.midiAccess({
    sysex: true
  });
  public midiSend$ = this.controlsForm.valueChanges.pipe(
    withLatestFrom(this.midiAccess$),
    filter(([_, midi]) => !!midi),
    tap(([value, midi]) => {
      midi.outputs.forEach(output => {
        const message = new Uint8Array([0xB0, 1, value.pitch]);
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

  closeVideo(mediaStream: MediaStream) {
    mediaStream.getTracks().forEach(track => mediaStream.removeTrack(track));
    this.videoStream$ = of(null);
  }

}
