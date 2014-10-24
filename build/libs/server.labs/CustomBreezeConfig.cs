/*****************************************************
 * Breeze Labs: CustomBreezeConfig
 *
 * v.1.0.0
 * Copyright 2014 IdeaBlade, Inc.  All Rights Reserved.
 * Licensed under the MIT License
 * http://opensource.org/licenses/mit-license.php
 *
 * Replaces Breeze's default "BreezeConfig"
 * with a derived version that overrides one of the
 * Json.Net serialization settings.
 *
 * For an example of usage see the Breeze "DocCode sample"
 *****************************************************/
using Newtonsoft.Json;
// ReSharper disable CheckNamespace
namespace Breeze.Serialization
{
  /// <summary>
  /// Replaces Breeze's default <see cref="Breeze.ContextProvider.BreezeConfig"/>
  /// with derived version that overrides the Json.Net serialization settings.
  /// </summary>
  /// <remarks>
  /// To enable, simply include this file in your Web API project,
  /// along with the supporting TypeRenamingSerializationBinder.cs
  /// Breeze discovers this implementation of <see cref="Breeze.ContextProvider.BreezeConfig"/>
  /// in the application's Web API assembly and uses it instead of its own.
  /// <para>
  /// There can be ONLY ONE such alternative implementation in the application.
  /// If you need additional Json.NET customizations, use this as a model
  /// and completely replace it in your project with your own custom configuration.
  /// </para><para>
  /// See the Breeze "DocCode sample" for an example of usage.
  /// </para>
  /// </remarks>
  public class CustomBreezeConfig : Breeze.ContextProvider.BreezeConfig
  {
    /// <summary>
    ///  Override SerializationBinder with TypeRenamingSerializationBinder
    /// </summary>
    protected override JsonSerializerSettings CreateJsonSerializerSettings() {
      var baseSettings = base.CreateJsonSerializerSettings();
      baseSettings.Binder = DynamicTypeRenamingSerializationBinder.Instance;
      return baseSettings;
    }
  }
}