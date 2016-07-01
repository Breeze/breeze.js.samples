import { EntityAspect, EntityType } from 'breeze-client';

export abstract class EntityBase {
  entityAspect: EntityAspect;
  entityType: EntityType;

  getErrorFor(prop: string): string {
    if (prop && prop.length) {
      return this.entityAspect.getValidationErrors(prop).map(ve => ve.errorMessage).join('. ');
    } else {
      return this.entityAspect.getValidationErrors().filter(ve => ve.property == null)
        .map(ve => ve.errorMessage).join('. ');
    }
  }

}
