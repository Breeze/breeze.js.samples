using System;
using System.Collections.Generic;
using System.Data;
using Breeze.ContextProvider;
using Newtonsoft.Json.Linq;

namespace DocCode.DataAccess
{
    /// <summary>
    /// A demonstration of technique to convert a saveBundle into a SaveMap
    /// for use by custom server code that didn't want to use a ContextProvider to handle
    /// change-set saves.
    /// </summary>
    /// <remarks>
    /// This class leverages utilities within the base ContextProvider to effect this conversion
    /// It is NOT a functioning ContextProvider!
    /// There are no examples of usage yet.
    /// </remarks>
    public class SaveBundleToSaveMap : ContextProvider
    {
        // Never create a public instance
        private SaveBundleToSaveMap(){}

        /// <summary>
        /// Convert a saveBundle into a SaveMap
        /// </summary>
        /// <param name="saveBundle">JSON object from client describing batch save</param>
        /// <param name="beforeSaveEntity">
        ///   optional function to evaluate each entity individually before it is saved.
        /// </param>
        /// <param name="beforeSaveEntities">
        ///   optional function to evaluate the entire collection of entities before they are saved.
        /// </param>
        public static Dictionary<Type, List<EntityInfo>> Convert(
          JObject saveBundle,
          Func<EntityInfo, bool> beforeSaveEntity = null,
          Func<Dictionary<Type, List<EntityInfo>>, Dictionary<Type, List<EntityInfo>>> beforeSaveEntities = null)
        {
          var provider = new SaveBundleToSaveMap
          {
            BeforeSaveEntityDelegate   = beforeSaveEntity,
            BeforeSaveEntitiesDelegate = beforeSaveEntities
          };
          provider.InitializeSaveState(saveBundle);
          provider.SaveWorkState.BeforeSave();
          return provider.SaveWorkState.SaveMap;
        }

        #region required overrides DO NOT USE ANY OF THEM
        public override IDbConnection GetDbConnection()
        {
            throw new NotImplementedException();
        }

        protected override void OpenDbConnection()
        {
            throw new NotImplementedException();
        }

        protected override void CloseDbConnection()
        {
            throw new NotImplementedException();
        }

        protected override string BuildJsonMetadata()
        {
            throw new NotImplementedException();
        }

        protected override void SaveChangesCore(SaveWorkState saveWorkState)
        {
            throw new NotImplementedException();
        }
    #endregion
    }
}
