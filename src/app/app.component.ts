import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Observable } from 'rxjs';
import { filter, withLatestFrom } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  public midiAccess$ = this.midiAccess({
    sysex: true
  });

  public controlsForm = this.fb.group({
    x: [60]
  });

  constructor(
    private fb: FormBuilder
  ) { }

  ngOnInit() {
    this.controlsForm.valueChanges.pipe(
      withLatestFrom(this.midiAccess$),
      filter(([_, midi]) => !!midi)
    ).subscribe(([value, midi]) => {
      midi.outputs.forEach(output => {
        const message = new Uint8Array([0xB0, 1, value.pitch]);
        output?.send(message);
      });
    });
  }

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

}
