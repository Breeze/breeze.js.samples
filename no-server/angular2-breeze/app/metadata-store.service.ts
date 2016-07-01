import { Injectable } from '@angular/core';
import { MetadataStore, Entity, NamingConvention } from 'breeze-client';

import { _RegistrationHelper } from './entities';
import { METADATA } from './entities';

NamingConvention.camelCase.setAsDefault();

@Injectable()
export class MetadataStoreService {

  private _metadataStore: MetadataStore;

  get metadataStore() {
    if (this._metadataStore) { return this._metadataStore; }
    this._metadataStore = new MetadataStore();
    this._metadataStore.importMetadata(METADATA);
    this._registerCtor(this._metadataStore);
    return this._metadataStore;
  }

  protected _registerCtor(metadataStore: MetadataStore) {
    _RegistrationHelper.register(this.metadataStore);
  }
}

let origRegister = MetadataStore.prototype.registerEntityTypeCtor;

@Injectable()
export class TestMetadataStoreService extends MetadataStoreService {

  protected _registerCtor(metadataStore: MetadataStore) {
    metadataStore.registerEntityTypeCtor =  (
      entityTypeName: string,
      entityCtor: Function,
      initializationFn?: (entity: Entity) => void,
      noTrackingFn?: (entity: Entity) => Entity): void => {

      entityCtor.prototype.entityType = undefined;
      entityCtor.prototype.complexType = undefined;

      origRegister.bind(metadataStore)(entityTypeName, entityCtor, initializationFn, noTrackingFn);

    };
    super._registerCtor(this.metadataStore);
  }
}
