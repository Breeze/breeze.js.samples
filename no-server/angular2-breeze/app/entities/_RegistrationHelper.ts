import { MetadataStore } from 'breeze-client';

import { Category } from './Category';
import { Product } from './Product';
import { Supplier } from './Supplier';
import { Customer } from './Customer';
import { Order } from './Order';
import { Employee } from './Employee';
import { EmployeeTerritory } from './EmployeeTerritory';
import { Territory } from './Territory';
import { Region } from './Region';
import { OrderDetail } from './OrderDetail';
import { InternationalOrder } from './InternationalOrder';
import { PreviousEmployee } from './PreviousEmployee';
import { Role } from './Role';
import { UserRole } from './UserRole';
import { User } from './User';

export class _RegistrationHelper {

    static register(metadataStore: MetadataStore) {
        metadataStore.registerEntityTypeCtor('Category', Category);
        metadataStore.registerEntityTypeCtor('Product', Product);
        metadataStore.registerEntityTypeCtor('Supplier', Supplier);
        metadataStore.registerEntityTypeCtor('Customer', Customer);
        metadataStore.registerEntityTypeCtor('Order', Order);
        metadataStore.registerEntityTypeCtor('Employee', Employee);
        metadataStore.registerEntityTypeCtor('EmployeeTerritory', EmployeeTerritory);
        metadataStore.registerEntityTypeCtor('Territory', Territory);
        metadataStore.registerEntityTypeCtor('Region', Region);
        metadataStore.registerEntityTypeCtor('OrderDetail', OrderDetail);
        metadataStore.registerEntityTypeCtor('InternationalOrder', InternationalOrder);
        metadataStore.registerEntityTypeCtor('PreviousEmployee', PreviousEmployee);
        metadataStore.registerEntityTypeCtor('Role', Role);
        metadataStore.registerEntityTypeCtor('UserRole', UserRole);
        metadataStore.registerEntityTypeCtor('User', User);
    }
}
