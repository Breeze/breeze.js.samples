/* tslint:disable:no-unused-variable */
import { AppComponent } from './app.component';
import { EntityManagerService } from './entity-manager.service';
import { MetadataStoreService,
         TestMetadataStoreService} from './metadata-store.service';

import {
  beforeEach, beforeEachProviders, withProviders,
  describe, ddescribe, xdescribe,
  expect, it, iit, xit,
  inject, async,
  ComponentFixture, TestComponentBuilder
} from '@angular/core/testing';

import { provide }        from '@angular/core';
import { ViewMetadata }   from '@angular/core';
import { BreezeBridgeAngular2 } from 'breeze-bridge-angular2';

/////////// Module Preparation ///////////////////////
interface Done {
    (): void;
    fail: (err: any) => void;
}

////////  SPECS  /////////////

describe('AppComponent', function() {

  let comp:    AppComponent;
  let fixture: ComponentFixture<any>;

  beforeEach(async(inject([TestComponentBuilder], (tcb: TestComponentBuilder) => {
    return tcb.overrideProviders(AppComponent, [
      BreezeBridgeAngular2,
      EntityManagerService,
      provide(MetadataStoreService, {useClass: TestMetadataStoreService})
    ])
    .createAsync(AppComponent).then(fix => {
      fixture = fix;
      comp = fixture.componentInstance;
    });
  })));

  it('should instantiate component', () => {
    expect(comp instanceof AppComponent).toBe(true, 'should create AppComponent');
  });

  it('should have expected <h1> text', () => {
    fixture.detectChanges();
    let h1 = fixture.debugElement.query(el => el.name === 'h1').nativeElement;
    expect(h1.innerText).toMatch(/customer name is acme/i, '<h1> should display "Acme" customer name');
  });
});
