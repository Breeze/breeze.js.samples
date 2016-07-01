import { Injectable } from '@angular/core';
import { EntityManager, EntityQuery } from 'breeze-client';
import { EntityManagerService } from './entity-manager.service';
import { Customer } from './entities';

@Injectable()
export class NorthwindService {

  private _em: EntityManager;

  constructor(ems: EntityManagerService) {
    this._em = ems.entityManager;
  }

  getAllCustomers(): Promise<Customer[]> {
    let query = EntityQuery.from('Customers').orderBy('companyName');

    return <Promise<Customer[]>><any> this._em.executeQuery(query)
    .then(res => res.results)
    .catch((error) => {
      console.log(error);
      return Promise.reject(error);
    });
  }
}
