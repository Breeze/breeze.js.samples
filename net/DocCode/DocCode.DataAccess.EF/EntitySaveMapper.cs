using System;
using System.Collections.Generic;

// ReSharper disable once CheckNamespace
namespace Breeze.ContextProvider {

  /// <summary>
  /// Interface for class that translates data between a client-facing <see cref="CType"/> entity  
  /// and a server-side <see cref="CType"/> entity. 
  /// as when translating from client-facing DTOs to the server-side persisted entity type.
  /// </summary>
  /// <remarks>
  /// See <see cref="EntitySaveMapper{STYPE, CTYPE} "/> for details
  /// </remarks>
  public interface IEntitySaveMapper {
    /// <summary>
    /// Get the entity type of the Client-facing entity (typically the DTO)
    /// </summary>
    Type CType { get;  }
    /// <summary>
    /// Get the entity type of the Server-side entity (the persisted entity)
    /// </summary>
    Type SType { get; }

    /// <summary>
    /// Convert the SaveMap <see cref="EntityInfo"/> entries of the <see cref="CType"/>
    /// into EntityInfo entries for the <see cref="SType"/>.
    /// </summary>
    /// <remarks>
    /// See <see cref="EntitySaveMapper{STYPE, CTYPE}.ConvertSaveMap "/> for details
    /// </remarks>
    Dictionary<Type, List<EntityInfo>> ConvertSaveMap(
      Func<Object, EntityState, EntityInfo> entityInfoCreator,
      Dictionary<Type, List<EntityInfo>> saveMap,
      Func<EntityInfo, bool> beforeSaveEntity = null);

    /// <summary>
    /// Convert the <see cref="SaveResult"/> returned by <see cref="ContextProvider.SaveChanges"/>
    /// from <see cref="SType"/> entities into the <see cref="CType"/> entities
    /// that the client is expecting.
    /// </summary>
    /// <remarks>
    /// See <see cref="EntitySaveMapper{STYPE, CTYPE}.ConvertSaveResult "/> for details
    /// </remarks>
    SaveResult ConvertSaveResult(SaveResult saveResult);
  }

  /// <summary>
  /// Extension methods to facilitate entity save mapping with
  /// one or more <see cref="IEntitySaveMapper"/> instances.
  /// </summary>
  public static class EntitySaveMapperExtensions {
    /// <summary>
    /// Convert an <see cref="EntityInfo"/> "SaveMap" with
    /// one or more <see cref="IEntitySaveMapper"/> instances.
    /// </summary>
    /// <remarks>
    /// See <see cref="EntitySaveMapper{STYPE, CTYPE}.ConvertSaveMap "/> for details
    /// </remarks>
    public static Dictionary<Type, List<EntityInfo>> ConvertSaveMap(
      this Dictionary<Type, List<EntityInfo>> saveMap,
      Func<Object, EntityState, EntityInfo> entityInfoCreator, 
      Func<EntityInfo, bool> beforeSaveEntity,
      params IEntitySaveMapper[] saveMappers) {

      foreach (var saveMapper in saveMappers) {
        saveMapper.ConvertSaveMap(entityInfoCreator, saveMap, beforeSaveEntity);
      }
      return saveMap;
    }

    /// <summary>
    /// Convert a <see cref="SaveResult"/> with
    /// one or more <see cref="IEntitySaveMapper"/> instances.
    /// </summary>
    /// <remarks>
    /// See <see cref="EntitySaveMapper{STYPE, CTYPE}.ConvertSaveMap "/> for details
    /// </remarks>
    public static SaveResult ConvertSaveResult(
      this SaveResult saveResult, params IEntitySaveMapper[] saveMappers) {

          foreach (var saveMapper in saveMappers) {
            saveMapper.ConvertSaveResult(saveResult);
          }
          return saveResult;
    }
  }

  /// <summary>
  /// Base class to translate data between a client-facing <see cref="CType"/> entity  
  /// and a server-side <see cref="CType"/> entity. 
  /// as when translating from client-facing DTOs to the server-side persisted entity type.
  /// </summary>
  /// <remarks>
  /// Assumes that there is a one-to-one relationship between a CType and SType entity
  /// and, if the keys are store-generated, that the key values on both sides 
  /// have the same number and types (even if their property names are different).
  /// <para>
  /// Derive from this class for specific STYPE/CTYPE pairs, overriding
  /// the mandatory abstract and optional virtual mapping methods.
  /// </para>
  /// </remarks>
  public abstract class EntitySaveMapper<STYPE, CTYPE> : IEntitySaveMapper
    where STYPE : class where CTYPE : class
  {
    /// <summary>
    /// Get the entity type of the Client-facing entity (typically the DTO)
    /// </summary>
    public Type CType { get { return cType; } }
    /// <summary>
    /// Get the entity type of the Server-side entity (the persisted entity)
    /// </summary>
    public Type SType { get { return sType; } }

    /// <summary>
    /// Convert the SaveMap <see cref="EntityInfo"/> entries of the <see cref="CType"/>
    /// into EntityInfo entries for the <see cref="SType"/>.
    /// </summary>
    /// <param name="entityInfoCreator">
    /// Function that creates a new <see cref="EntityInfo"/> for a
    /// given entity and optional <see cref="EntityState"/>.
    /// See <see cref="ContextProvider.CreateEntityInfo"/>.
    /// </param>
    /// <param name="saveMap">
    /// The "SaveMap" passed into the <see cref="ContextProvider.BeforeSaveEntities"/> method.
    /// </param>
    /// <param name="beforeSaveEntity">
    /// Optional function to validate an individual entity before it can save;
    /// see <see cref="ContextProvider.BeforeSaveEntity"/>"/>;
    /// </param>
    /// <remarks>
    /// Updates the "SaveMap" by converting those <see cref="EntityInfo"/> objects
    /// constructed from the JSON "saveBundle" in terms of the client's entity type
    /// into corresponding EntityInfos expressed in terms of the server entity type.
    /// Converts with the <see cref="MapEntityToServer"/>.
    /// <para>
    /// Call it inside your <see cref="ContextProvider.BeforeSaveEntities"/>
    /// override or delegate method.
    /// </para>
    /// </remarks>
    public Dictionary<Type, List<EntityInfo>> ConvertSaveMap(
        Func<Object, EntityState, EntityInfo> entityInfoCreator,
        Dictionary<Type, List<EntityInfo>> saveMap,
        Func<EntityInfo, bool> beforeSaveEntity = null) {

      List<EntityInfo> cGroup, sGroup;

      if (saveMap.TryGetValue(cType, out cGroup)){
        saveMap.Remove(cType); // don't save CType entities
      } else {
        return saveMap;        // this CType is not in the saveMap
      }

      if (!saveMap.TryGetValue(sType, out sGroup)) {
        sGroup = new List<EntityInfo>();
        saveMap.Add(sType, sGroup);
      }

      foreach (var cEntityInfo in cGroup) {
        var sEntity = MapEntityToServer((CTYPE)cEntityInfo.Entity);
        var mappedEntityInfo = entityInfoCreator(sEntity, cEntityInfo.EntityState);
        mappedEntityInfo.OriginalValuesMap = MapOriginalValues(cEntityInfo.OriginalValuesMap);
        mappedEntityInfo.AutoGeneratedKey = MapAutoGeneratedKey(sEntity, cEntityInfo.AutoGeneratedKey);
        mappedEntityInfo.ForceUpdate = cEntityInfo.ForceUpdate;

        // Unfortunately, UnmappedValuesMap is "protected internal" right now so can't copy
        //mappedEntityInfo.UnmappedValuesMap = entityInfo.UnmappedValuesMap;

        if (beforeSaveEntity == null ||  beforeSaveEntity(mappedEntityInfo)) {
          sGroup.Add(mappedEntityInfo);
        }
      }
      return saveMap;
    }

    /// <summary>
    /// Convert the <see cref="SaveResult"/> returned by <see cref="ContextProvider.SaveChanges"/>
    /// from <see cref="SType"/> entities into the <see cref="CType"/> entities
    /// that the client is expecting.
    /// </summary>
    /// <param name="saveResult">
    /// The <see cref="SaveResult"/> returned by <see cref="ContextProvider.SaveChanges"/>
    /// </param>
    /// <remarks>
    /// Convert the <see cref="SaveResult.Entities"/> and <see cref="SaveResult.KeyMappings"/>.
    /// It uses the <see cref="MapEntityToClient"/> to convert the <see cref="SType"/> entities into
    /// corresponding <see cref="CType"/> entities.
    /// Use <see cref="MapEntityToClient"/> to convert the <see cref="SType"/> entities in
    /// <see cref="SaveResult.Entities"/> with 
    /// <para>
    /// Call it in your wrapper around the <see cref="ContextProvider.SaveChanges"/>
    /// where it can fixup the SaveResult before it is serialized to the client.
    /// </para>
    /// </remarks>
    public SaveResult ConvertSaveResult(SaveResult saveResult) {
      var saved = saveResult.Entities;
      for (var i = 0; i < saved.Count; i++) {
        var entity = saved[i] as STYPE;
        if (entity != null) {
          saved[i] = MapEntityToClient(entity);
        }
      }
      var sName = SType.Name;
      var cName = CType.Name;
      saveResult.KeyMappings.ForEach(km =>
      {
        if (km.EntityTypeName == sName) { km.EntityTypeName = cName; }       
      });
      return saveResult;
    }

    protected readonly Type sType = typeof (STYPE);
    protected readonly Type cType = typeof(CTYPE);

    /// <summary>
    /// Map a server <see cref="SType"/> to client <see cref="CType"/> entity.
    /// </summary>
    /// <remarks>
    /// Needed by <see cref="ConvertSaveResult"/>.
    /// All <see cref="EntitySaveMapper{STYPE, CTYPE}"/> classes must implement.
    /// </remarks>
    protected abstract CTYPE MapEntityToClient(STYPE sEntity);

    /// <summary>
    /// Map a client <see cref="CType"/> to server <see cref="SType"/> entity.
    /// </summary>
    /// <remarks>
    /// Needed by <see cref="ConvertSaveMap"/>.
    /// All <see cref="EntitySaveMapper{STYPE, CTYPE}"/> classes must implement.
    /// </remarks>
    protected abstract STYPE MapEntityToServer(CTYPE cEntity);

    /// <summary>
    /// Map the client's <see cref="EntityInfo.OriginalValuesMap"/>
    /// to properties of the server entity.
    /// </summary>
    protected virtual Dictionary<String, Object> MapOriginalValues(Dictionary<String, Object> clientOriginalValues = null)
    {
      return clientOriginalValues;
    }

    /// <summary>
    /// Map the <see cref="AutoGeneratedKey"/> created from client EntityInfo
    /// to an AutoGeneratedKey for the server entity.
    /// </summary>
    /// <remarks>
    /// This implementation assumes that the Property name is <see cref="AutoGeneratedKey"/>
    /// is unchanged even though the type of the entity has changed.
    /// </remarks>
    protected virtual AutoGeneratedKey MapAutoGeneratedKey(STYPE targetEntity, AutoGeneratedKey clientAutoGeneratedKey = null) {
      if (clientAutoGeneratedKey != null) {
        clientAutoGeneratedKey.Entity = targetEntity;
      }
      return clientAutoGeneratedKey;
    }

  }
}
