/*****************************************************
 * Breeze Labs: DynamicTypeRenamingSerializationBinder
 *
 * v.1.0.0
 * Copyright 2014 IdeaBlade, Inc.  All Rights Reserved.
 * Licensed under the MIT License
 * http://opensource.org/licenses/mit-license.php
 *
 * A derivative of the .NET SerializationBinder
 * that renames the serialized type name of
 * dynamically generated types
 *****************************************************/
using System;
using System.Runtime.Serialization;
using Newtonsoft.Json.Serialization;
// ReSharper disable CheckNamespace
namespace Breeze.Serialization
{
  /// <summary>
  /// Renames the serialized type name of dynamically generated types.
  /// Used by Json.Net when populating the $type property in
  /// JSON serializated data.
  /// </summary>
  /// <remarks>
  /// This class delegates to the Json.Net <see cref="DefaultSerializationBinder"/>
  /// except when serializing a dynamic type in which case it outputs a
  /// simplified version of the dynamic type name and pretends the type
  /// belongs to an assembly named "Dynamic".
  /// <para>
  /// It cures an objection many people have to the actual CLR name of the
  /// dynamic type that is created for objects returned by a projection into an anonymous type.
  /// </para>
  /// </remarks>
  /// <example>
  /// A projection query in John Papa's "Code Camper Jumpstart" sample returns
  /// an anonymous type. With the default binder, the serialized name for that type is
  /// "_IB_DGU56or_prSk3yzZB87I8gCBWABk[[System.Int32, mscorlib],[System.String, mscorlib],[System.String, mscorlib],[System.Int32, mscorlib],[System.Int32, mscorlib],[System.Int32, mscorlib],[System.Int32, mscorlib],[System.String, mscorlib],[System.String, mscorlib]], _IB_DGU56or_prSk3yzZB87I8gCBWABk_IdeaBlade"
  /// <para>This binder will intercept that type and name it
  /// "_IB_DGU56or_prSk3yzZB87I8gCBWABk, Dynamic".</para>
  /// <para>Does the same thing for the anonymous types that a controller could return.
  /// For example, the DocCode "Lookups" endpoint creates and returns an anonymous object.
  /// This binder will cause the $type to be something like "&lt;>f__AnonymousType6`3, Dynamic".</para>
  /// </example>
  public class DynamicTypeRenamingSerializationBinder : SerializationBinder
  {
    private static readonly DefaultSerializationBinder BaseInstance =
      new DefaultSerializationBinder();

    internal static readonly DynamicTypeRenamingSerializationBinder Instance =
      new DynamicTypeRenamingSerializationBinder(true);

    private readonly SerializationBinder _binder;

    public DynamicTypeRenamingSerializationBinder() : this(false) { }

    private DynamicTypeRenamingSerializationBinder(bool useStaticBaseInstance)
    {
      _binder = useStaticBaseInstance ? BaseInstance : new DefaultSerializationBinder();
    }

    public override Type BindToType(string assemblyName, string typeName) {
      return _binder.BindToType(assemblyName, typeName);
    }

    public override void BindToName(Type serializedType, out string assemblyName, out string typeName)
    {
      if (serializedType.FullName.Contains("["))
      // It's either a dynamic type as a result of projection or an
      // anonymous type perhaps constructed by a controller (e.g, a "Lookups" object)
      //
      // These two predicates would work for dynamic types but not anonymous types
      // if (serializedType.Assembly.IsDynamic)
      // if (serializedType.BaseType == typeof(Breeze.ContextProvider.DynamicTypeBase))
      {
        assemblyName = "Dynamic";
        typeName = serializedType.Name;
      } else {
        _binder.BindToName(serializedType, out assemblyName, out typeName);
      }
    }
  }
}