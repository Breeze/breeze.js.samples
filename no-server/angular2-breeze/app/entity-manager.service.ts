import { Injectable } from '@angular/core';
import { EntityManager, DataService } from 'breeze-client';

import { MetadataStoreService } from './metadata-store.service';

let webApiUrl = 'http://sampleservice.breezejs.com/api/northwind';

@Injectable()
export class EntityManagerService {

  entityManager: EntityManager;

  constructor(metadataStoreService: MetadataStoreService) {
    let dataservice = new DataService({
      serviceName: webApiUrl,
      hasServerMetadata: false
    });

    this.entityManager = new EntityManager({
      dataService: dataservice,
      metadataStore: metadataStoreService.metadataStore
    });
  }
}
