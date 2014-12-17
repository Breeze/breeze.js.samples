using System;
using System.Collections.Generic;

// ReSharper disable once CheckNamespace
namespace Breeze.ContextProvider {
  using SaveMap                   = Dictionary<Type, List<EntityInfo>>;
  using BeforeSaveEntityDelegate  = Func<EntityInfo, bool>;
  using EntityInfoCreator         = Func<Object, EntityState, EntityInfo>;

  /// <summary>
  /// Interface for class that translates data between a client-facing entity  
  /// and a server-side entity. 
  /// as when translating from client-facing DTOs to the server-side persisted entity type.
  /// </summary>
  /// <remarks>
  /// See <see cref="EntitySaveMapper{STYPE, CTYPE} "/> for details
  /// </remarks>
  public interface IEntitySaveMapper {

    /// <summary>
    /// Convert the SaveMap <see cref="EntityInfo"/> entries of the client type
    /// into EntityInfo entries for the server type.
    /// </summary>
    /// <remarks>
    /// See <see cref="EntitySaveMapper{STYPE, CTYPE}.ConvertBeforeSaveMap "/> for details
    /// </remarks>
    SaveMap ConvertBeforeSaveMap(
      SaveMap saveMap,
      EntityInfoCreator entityInfoCreator,
      BeforeSaveEntityDelegate beforeSaveEntity = null);

    /// <summary>
    /// Convert the post-save server entities into client entities.
    /// </summary>
    /// <remarks>
    /// See <see cref="EntitySaveMapper{STYPE, CTYPE}.ConvertAfterSaveMap "/> for details
    /// </remarks>
    SaveMap ConvertAfterSaveMap(
      SaveMap saveMap,
      List<KeyMapping> keyMappings,
      EntityInfoCreator entityInfoCreator);
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
    /// See <see cref="EntitySaveMapper{STYPE, CTYPE}.ConvertBeforeSaveMap "/> for details
    /// </remarks>
    public static SaveMap ConvertBeforeSaveMap(
      this SaveMap saveMap,
      EntityInfoCreator entityInfoCreator, 
      BeforeSaveEntityDelegate beforeSaveEntity,
      params IEntitySaveMapper[] saveMappers) {

        foreach (var saveMapper in saveMappers) {
          saveMapper.ConvertBeforeSaveMap(saveMap, entityInfoCreator, beforeSaveEntity);
        }
        return saveMap;
    }

    /// <summary>
    /// Convert the post-save server entities into client entities.
    /// </summary>
    /// <remarks>
    /// See <see cref="EntitySaveMapper{STYPE, CTYPE}.ConvertAfterSaveMap "/> for details
    /// </remarks>
    public static SaveMap ConvertAfterSaveMap(
      this SaveMap saveMap,
      List<KeyMapping> keyMappings,
      EntityInfoCreator entityInfoCreator,
      params IEntitySaveMapper[] saveMappers) {

        foreach (var saveMapper in saveMappers) {
          saveMapper.ConvertAfterSaveMap(saveMap, keyMappings, entityInfoCreator);
        }
        return saveMap;
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
    /// <param name="saveMap">
    /// The "SaveMap" passed into the <see cref="ContextProvider.BeforeSaveEntities"/> method.
    /// </param>
    /// <param name="entityInfoCreator">
    /// Function that creates a new <see cref="EntityInfo"/> for a
    /// given entity and optional <see cref="EntityState"/>.
    /// See <see cref="ContextProvider.CreateEntityInfo"/>.
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
    public SaveMap ConvertBeforeSaveMap(
        SaveMap saveMap,
        EntityInfoCreator entityInfoCreator,
        BeforeSaveEntityDelegate beforeSaveEntity = null) {

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
        var sEntity = MapEntityToServer(cEntityInfo);
        if (sEntity == null) { continue; }

        var mappedEntityInfo = entityInfoCreator(sEntity, cEntityInfo.EntityState);
        mappedEntityInfo.OriginalValuesMap = MapOriginalValues(cEntityInfo.OriginalValuesMap);
        mappedEntityInfo.AutoGeneratedKey = MapAutoGeneratedKey(sEntity, cEntityInfo.AutoGeneratedKey);
        mappedEntityInfo.ForceUpdate = cEntityInfo.ForceUpdate;

        // TODO: Fix this deficiency
        // Unfortunately, UnmappedValuesMap is "protected internal" right now so can't copy
        //mappedEntityInfo.UnmappedValuesMap = entityInfo.UnmappedValuesMap;

        if (beforeSaveEntity == null ||  beforeSaveEntity(mappedEntityInfo)) {
          sGroup.Add(mappedEntityInfo);
        }
      }
      return saveMap;
    }

    /// <summary>
    /// Convert the post-save <see cref="SType"/> entities into the <see cref="CType"/> entities
    /// that the client is expecting.
    /// </summary>
    /// <param name="saveMap">
    /// The <see cref="SaveResult"/> returned by <see cref="ContextProvider.SaveChanges"/>
    /// </param>
    /// <param name="keyMappings">
    /// The <see cref="SaveResult"/> returned by <see cref="ContextProvider.SaveChanges"/>
    /// </param>
    /// <param name="entityInfoCreator">
    /// Function that creates a new <see cref="EntityInfo"/> for a
    /// given entity and optional <see cref="EntityState"/>.
    /// See <see cref="ContextProvider.CreateEntityInfo"/>.
    /// </param>
    /// <remarks>
    /// Converts the <see cref="SType"/> entities in the "SaveMap" and <see cref="KeyMapping"/> list 
    /// passed to the <see cref="ContextProvider.AfterSaveEntities"/> after
    /// the <see cref="ContextProvider.SaveChangesCore"/>.
    /// It uses the <see cref="MapEntityToClient"/> to convert the <see cref="SType"/> entities into
    /// corresponding <see cref="CType"/> entities.
    /// Use <see cref="MapEntityToClient"/> to convert the <see cref="SType"/> entities in
    /// <see cref="SaveResult.Entities"/> with 
    /// <para>
    /// Call it in your wrapper around the <see cref="ContextProvider.SaveChanges"/>
    /// where it can fixup the SaveResult before it is serialized to the client.
    /// </para>
    /// </remarks>
    public SaveMap ConvertAfterSaveMap(
      SaveMap saveMap, List<KeyMapping> keyMappings, EntityInfoCreator entityInfoCreator) {

      List<EntityInfo> cGroup, sGroup;

      if (saveMap.TryGetValue(SType, out sGroup)) {
        saveMap.Remove(sType); // don't return SType entities to client
      } else {
        return saveMap;        // this SType is not in the saveMap
      }

      if (!saveMap.TryGetValue(cType, out cGroup)) {
        cGroup = new List<EntityInfo>();
        saveMap.Add(cType, cGroup);
      }

      foreach (var sEntityInfo in sGroup) {
        var cEntity = MapEntityToClient(sEntityInfo);
        if (cEntity != null)
        {
          var mappedEntityInfo = entityInfoCreator(cEntity, sEntityInfo.EntityState);
          // No other conversions are needed.
          cGroup.Add(mappedEntityInfo);       
        }
      }

      var sName = SType.FullName;
      var cName = CType.FullName;
      keyMappings.ForEach(km => {
        if (km.EntityTypeName == sName) { km.EntityTypeName = cName; }
      });
      return saveMap;
    }

    protected readonly Type sType = typeof (STYPE);
    protected readonly Type cType = typeof(CTYPE);

    /// <summary>
    /// Map the server <see cref="SType"/> entity in a <see cref="EntityInfo"/>  
    /// to a client <see cref="CType"/> entity.
    /// </summary>
    /// <remarks>
    /// Needed by <see cref="ConvertAfterSaveMap"/>.
    /// All <see cref="EntitySaveMapper{STYPE, CTYPE}"/> classes must implement.
    /// </remarks>
    protected abstract CTYPE MapEntityToClient(EntityInfo info);

    /// <summary>
    /// Map the client <see cref="CType"/> entity in a <see cref="EntityInfo"/>  
    /// to a server <see cref="SType"/> entity.
    /// </summary>
    /// <remarks>
    /// Needed by <see cref="ConvertBeforeSaveMap"/>.
    /// All <see cref="EntitySaveMapper{STYPE, CTYPE}"/> classes must implement.
    /// </remarks>
    protected abstract STYPE MapEntityToServer(EntityInfo info);

    /// <summary>
    /// Map the client's <see cref="EntityInfo.OriginalValuesMap"/>
    /// to properties of the server entity.
    /// </summary>
    protected virtual Dictionary<String, Object> MapOriginalValues(Dictionary<String, Object> clientOriginalValues = null)
    {
      return clientOriginalValues;
    }

    /// <summary>
    /// Map the <see cref="AutoGeneratedKey"/> created from the source EntityInfo
    /// to an AutoGeneratedKey for the <param name="targetEntity"></param>.
    /// </summary>
    /// <remarks>
    /// This implementation assumes that the Property name in <see cref="AutoGeneratedKey"/>
    /// is unchanged even though the type of the entity has changed.
    /// </remarks>
    protected virtual AutoGeneratedKey MapAutoGeneratedKey<T>(T targetEntity, AutoGeneratedKey autoGeneratedKey = null) {
      if (autoGeneratedKey != null) {
        autoGeneratedKey.Entity = targetEntity;
      }
      return autoGeneratedKey;
    }

  }
}
