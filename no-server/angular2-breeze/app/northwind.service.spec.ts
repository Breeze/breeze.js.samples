/* tslint:disable:no-unused-variable */
import { provide } from '@angular/core';
import { AppComponent } from './app.component';
import { BreezeBridgeAngular2 } from 'breeze-bridge-angular2';
import { HTTP_PROVIDERS } from '@angular/http';
import { EntityManagerService } from './entity-manager.service';
import { MetadataStoreService,
         TestMetadataStoreService} from './metadata-store.service';
import { NorthwindService } from './northwind.service';

import {
  beforeEach, beforeEachProviders, withProviders,
  describe, ddescribe, xdescribe,
  expect, it, iit, xit,
  inject, async
} from '@angular/core/testing';

interface Done {
    (): void;
    fail: (err: any) => void;
}

/////////// Specs ///////////////////////
describe('NorthwindService', () => {

  let northwindService: NorthwindService;

  beforeEachProviders(() => {
    return [
      BreezeBridgeAngular2,
      EntityManagerService,
      HTTP_PROVIDERS,
      NorthwindService,
      provide(MetadataStoreService, {useClass: TestMetadataStoreService})
    ];
  });

  beforeEach(inject([NorthwindService, BreezeBridgeAngular2], (service: NorthwindService) => {
    northwindService = service;
  }));


  /// Delete this
  it('should run a passing test', () => {
    expect(true).toEqual(true, 'should pass');
  });

  it('can get customers from server', async(() => {
    northwindService.getAllCustomers()
    .then(() => {});
  }));

});
