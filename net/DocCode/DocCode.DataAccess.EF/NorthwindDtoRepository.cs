using System;
using System.Collections.Generic;
using System.Linq;
using Breeze.ContextProvider;
using Breeze.ContextProvider.EF6;
using Newtonsoft.Json.Linq;
using Northwind.DtoModels;

namespace DocCode.DataAccess
{
  using SaveMap = Dictionary<Type, List<EntityInfo>>;

  /// <summary>
  /// Repository (a "Unit of Work" really) of NorthwindDto models.
  /// </summary>
  public class NorthwindDtoRepository
  {
    public NorthwindDtoRepository() {
      // wraps the "real" server-model Northwind DbContext
      _contextProvider = new DtoEFContextProvider();
    }

    public string Metadata {
      get {
        return new EFContextProvider<NorthwindDtoContext>().Metadata();
      }
    }

    public SaveResult SaveChanges(JObject saveBundle) {
      PrepareSaveGuard();
      return _contextProvider.SaveChanges(saveBundle);
    }

    public IQueryable<Category> Categories {
      get {
        return Context.Categories.Select(c => new Category
        {
          CategoryID = c.CategoryID,
          CategoryName = c.CategoryName
        });
      }
    }

    public IQueryable<Customer> Customers {
      get {
        return ForCurrentUser(Context.Customers).Select(c => new Customer
        {
          CustomerID = c.CustomerID,
          CompanyName = c.CompanyName,
          OrderCount = c.Orders.Count()
        });
      }
    }

    public Customer CustomerById(Guid id) {
      // FOR DEBUGGING ONLY
      //var sCust = Context.Customers.SingleOrDefault(c => c.CustomerID == id);

       var cust = ForCurrentUser(Context.Customers)
                .Where(c => c.CustomerID == id)
                .Select(c => new Customer
                {
                  CustomerID = c.CustomerID,
                  CompanyName = c.CompanyName,
                  OrderCount = c.Orders.Count()
                })
                .SingleOrDefault();

      // Super secret proprietary calculation. Do not disclose to client!
      if (cust != null) { cust.FragusIndex = new Random().Next(100); }
      return cust;
    }

    // Get Orders and their OrderDetails
    public IQueryable<Order> Orders {
      get {
        return ForCurrentUser(Context.Orders).Select(o => new Order
        {
          OrderID = o.OrderID,
          CustomerID = o.CustomerID,
          CustomerName = o.Customer.CompanyName,
          OrderDate = o.OrderDate,
          RequiredDate = o.RequiredDate,
          ShippedDate = o.ShippedDate,
          Freight = o.Freight,
          RowVersion = o.RowVersion,

          OrderDetails = o.OrderDetails.Select(od => new OrderDetail
          {
            OrderID = od.OrderID,
            ProductID = od.ProductID,
            UnitPrice = od.UnitPrice,
            Quantity = od.Quantity,
            Discount = od.Discount,
            RowVersion = od.RowVersion
          }).ToList()

        });
      }
    }

    public IQueryable<Product> Products {
      get {
        return Context.Products.Select(p => new Product
        {
          ProductID = p.ProductID,
          ProductName = p.ProductName,
          CategoryID = p.CategoryID,
          SupplierID = p.SupplierID
        });
      }
    }

    public IQueryable<Supplier> Suppliers {
      get {
        return Context.Suppliers.Select(s => new Supplier
        {
          SupplierID = s.SupplierID,
          CompanyName = s.CompanyName
        });
      }
    }

    /// <summary>
    /// The current user's UserSessionId, typically set by the controller
    /// </summary>
    /// <remarks>
    /// Guaranteed to exist and be a non-Empty Guid
    /// </remarks>
    public Guid UserSessionId {
      get { return _userSessionId; }
      set {
        _userSessionId = (value == Guid.Empty) ? _guestUserSessionId : value;
      }
    }

    #region private
    
    private Northwind.Models.NorthwindContext Context {
      get { return _contextProvider.Context; }
    }

    private IQueryable<T> ForCurrentUser<T>(IQueryable<T> query)
        where T : class, Northwind.Models.ISaveable {
      return query.Where(x => x.UserSessionId == null || x.UserSessionId == UserSessionId);
    }

    private void PrepareSaveGuard() {
      if (_entitySaveGuard == null) {
        _entitySaveGuard = new NorthwindEntitySaveGuard { UserSessionId = UserSessionId };
        _contextProvider.BeforeSaveEntitiesDelegate += BeforeSaveEntities;
        _contextProvider.AfterSaveEntitiesDelegate += AfterSaveEntities;
      }
    }

    private SaveMap BeforeSaveEntities(SaveMap saveMap) {

      // Only save selected DTO types
      var badType = saveMap.Keys
        .FirstOrDefault(k => k != typeof(Customer) && k != typeof(Product));

      if (badType != null) {
        throw new InvalidOperationException("Cannot save changes to type " + badType.Name);
      }

      // Need a new NorthwindDtoRepository for reading; 
      // Can't use the existing one during a save because for unknown reason 
      // EF DbContext crashes with nullref exception.
      var readRepo = new NorthwindDtoRepository { UserSessionId = UserSessionId };

      _customerMapper = new CustomerMapper(readRepo);
      _productMapper = new ProductMapper();


      // convert DTO types to corresponding server types
      saveMap.ConvertBeforeSaveMap(
        _contextProvider.CreateEntityInfo, _entitySaveGuard.BeforeSaveEntity,
        _customerMapper, _productMapper);

      // Now ready to apply server model validation
      _entitySaveGuard.BeforeSaveEntities(saveMap);

      return saveMap;
    }

    private void AfterSaveEntities(SaveMap saveMap, List<KeyMapping> keyMappings) {

      // Apply server model post-save actions first
      _entitySaveGuard.AfterSaveEntities(saveMap, keyMappings);

      // Now convert from server types to corresponding client types
      saveMap.ConvertAfterSaveMap(
        keyMappings, _contextProvider.CreateEntityInfo,
        _customerMapper, _productMapper);
    }

    private readonly DtoEFContextProvider _contextProvider;

    private NorthwindEntitySaveGuard _entitySaveGuard;
    private CustomerMapper _customerMapper;
    private ProductMapper _productMapper;

    private const string _guestUserSessionIdName = "12345678-9ABC-DEF0-1234-56789ABCDEF0";
    private static readonly Guid _guestUserSessionId = new Guid(_guestUserSessionIdName);
    private Guid _userSessionId = _guestUserSessionId;

    #endregion

    #region DtoEFContextProvider

    // Hack: need to patch saveWorkState before letting save continue
    // TODO: record defect in OnTime and remove this hack when fixed
    private class DtoEFContextProvider : EFContextProvider<Northwind.Models.NorthwindContext>
    {
      protected override void SaveChangesCore(SaveWorkState saveWorkState) {
        // Must re-calculate EntitiesWithAutoGeneratedKeys because
        // SaveWorkstate.BeforeSave (see ContextProvider.cs) calculates it before
        // calling `BeforeSaveEntities` which is TOO SOON (defect)
        // Fortunately, we can intercept, recalc, and reset this property 
        // before actually saving
        saveWorkState.EntitiesWithAutoGeneratedKeys = saveWorkState.SaveMap
                .SelectMany(eiGrp => eiGrp.Value)
                .Where(ei => ei.AutoGeneratedKey != null)
                .ToList();
        base.SaveChangesCore(saveWorkState);
      }
    }
    #endregion
  }

  #region CustomerMapper
  public class CustomerMapper : EntitySaveMapper<Northwind.Models.Customer, Customer>
  {
    private readonly NorthwindDtoRepository repo;

    public CustomerMapper(NorthwindDtoRepository repo) {
      this.repo = repo;
    }

    protected override Customer MapEntityToClient(EntityInfo entityInfo) {
      Customer cust;
      var c = (Northwind.Models.Customer)entityInfo.Entity;

      if (entityInfo.EntityState == EntityState.Modified) {
        // Would be dead simple if we didn't have to get the CustomerDTO.OrderCount from the db.
        // Incredibly inefficient if we save a lot of these modified customers at once 
        // but this is a demo afterall
        cust = repo.CustomerById(c.CustomerID);
        if (cust == null) {
          throw new Exception("Couldn't re-query modified customer with ID " + c.CustomerID);
        }
      } else {
        // Don't need to say much about deleted Customer and
        // a new customer has OrderCount = 0
        cust = new Customer
        {
          CustomerID = c.CustomerID,
          CompanyName = c.CompanyName
        };
      }
      return cust;
    }

    protected override Northwind.Models.Customer MapEntityToServer(EntityInfo entityInfo) {
      var c = (Customer)entityInfo.Entity;

      return new Northwind.Models.Customer
      {
        CustomerID = c.CustomerID,
        CompanyName = c.CompanyName
      };
    }
  }
  #endregion

  #region ProductMapper
  public class ProductMapper : EntitySaveMapper<Northwind.Models.Product, Product>
  {
    protected override Product MapEntityToClient(EntityInfo entityInfo) {
      var p = (Northwind.Models.Product)entityInfo.Entity;
      return new Product
      {
        ProductID = p.ProductID,
        ProductName = p.ProductName,
        CategoryID = p.CategoryID,
        SupplierID = p.SupplierID
      };
    }

    protected override Northwind.Models.Product MapEntityToServer(EntityInfo entityInfo) {
      var p = (Product)entityInfo.Entity;
      return new Northwind.Models.Product
      {
        ProductID = p.ProductID,
        ProductName = p.ProductName,
        CategoryID = p.CategoryID,
        SupplierID = p.SupplierID
      };
    }
  }
  #endregion
}