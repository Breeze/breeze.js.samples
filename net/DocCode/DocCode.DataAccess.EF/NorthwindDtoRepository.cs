using System;
using System.Collections.Generic;
using System.Linq;
using Breeze.ContextProvider;
using Breeze.ContextProvider.EF6;
using Newtonsoft.Json.Linq;
using Northwind.DtoModels;

namespace DocCode.DataAccess
{
    /// <summary>
    /// Repository (a "Unit of Work" really) of NorthwindDto models.
    /// </summary>
    public class NorthwindDtoRepository
    {
        public NorthwindDtoRepository()
        {
            // for the server-model "real" Northwind DbContext
            _contextProvider = new DtoEFContextProvider();
        }

        public string Metadata
        {
            get
            {
                return new EFContextProvider<NorthwindDtoContext>().Metadata();
            }
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

        public IQueryable<Customer> Customers
        {
            get { return ForCurrentUser(Context.Customers).Select(c => new Customer {
                    CustomerID = c.CustomerID,
                    CompanyName = c.CompanyName,
                    OrderCount = c.Orders.Count()
                });
            }
        }

        public Customer CustomerById(Guid id)
        {
          // FOR DEBUGGING ONLY
          // var sCust = Context.Customers.SingleOrDefault(c => c.CustomerID == id);

          var cust = ForCurrentUser(Context.Customers)
                    .Where(c =>c.CustomerID == id)
                    .Select(c => new Customer {
                        CustomerID = c.CustomerID,
                        CompanyName = c.CompanyName,
                        OrderCount = c.Orders.Count()})
                     .SingleOrDefault();
               
            // Super secret proprietary calculation. Do not disclose to client!
            if (cust != null) { cust.FragusIndex = new Random().Next(100); }
            return cust;
        }

        // Get Orders and their OrderDetails
        public IQueryable<Order> Orders
        {
            get { return ForCurrentUser(Context.Orders).Select(o => new Order {
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

        public IQueryable<Product> Products
        {
            get { return Context.Products.Select(p => new Product {
                ProductID = p.ProductID,
                ProductName = p.ProductName
                });
            } 
        }

        public IQueryable<Supplier> Suppliers {
          get {
            return Context.Suppliers.Select(s => new Supplier
            {
              SupplierID  = s.SupplierID,
              CompanyName = s.CompanyName
            });
          }
        }

        /// <summary>
        /// The current user's UserSessionId, typically set by the controller
        /// </summary>
        /// <remarks>
        /// If requested, it must exist and be a non-Empty Guid
        /// </remarks>
        public Guid UserSessionId
        {
            get { return _userSessionId; }
            set {
                _userSessionId = (value == Guid.Empty) ? _guestUserSessionId : value;
            }
        }

        public SaveResult SaveChanges(JObject saveBundle) {

          // Need a new NorthwindDtoRepository for reading; 
          // Can't use the existing one for some as yet unexplained reason because
          // DbContext crashes with null ref exception inside EF when it
          // is also being used for save.
          var readRepo = new NorthwindDtoRepository { UserSessionId = UserSessionId };  

          // can't use the same one in the middle of the save
          _customerMapper = new CustomerMapper(readRepo);
          _productMapper = new ProductMapper();

          _contextProvider.BeforeSaveEntitiesDelegate += BeforeSaveEntities;

          // save with server model's "real" contextProvider
          var saveResult = _contextProvider.SaveChanges(saveBundle);

          // map server entities to client entities
          saveResult.ConvertSaveResult(_customerMapper, _productMapper);
          return saveResult;
        }

        private Dictionary<Type, List<EntityInfo>> BeforeSaveEntities(Dictionary<Type, List<EntityInfo>> saveMap) {

          // Block save of all unconvertable types
          var badSave = saveMap.Keys
            .FirstOrDefault(k => k != typeof(Customer) && k != typeof(Product));

          if (badSave != null) {
            throw new InvalidOperationException("Cannot save changes to type " + badSave.Name);
          }

          // Create the same SaveGuard that the normal NorthwindRepository uses
          var entitySaveGuard = new NorthwindEntitySaveGuard {UserSessionId = UserSessionId};

          // convert ok DTO types to corresponding server types
          saveMap.ConvertSaveMap(_contextProvider.CreateEntityInfo, entitySaveGuard.BeforeSaveEntity,
            _customerMapper, _productMapper);

          // if NorthwindEntitySaveGuard had a BeforeSaveEntities, we'd call it now.
          // entitySaveGuard.BeforeSaveEntities(saveMap);
          return saveMap;
        }

        private IQueryable<T> ForCurrentUser<T>(IQueryable<T> query) 
            where T : class, Northwind.Models.ISaveable
        {
            return query.Where(x => x.UserSessionId == null || x.UserSessionId == UserSessionId);
        }


        private Northwind.Models.NorthwindContext Context { 
            get { return _contextProvider.Context; } 
        }
        private readonly DtoEFContextProvider _contextProvider;
        private CustomerMapper _customerMapper;
        private ProductMapper _productMapper;
        private const string _guestUserSessionIdName = "12345678-9ABC-DEF0-1234-56789ABCDEF0";
        private static readonly Guid _guestUserSessionId = new Guid(_guestUserSessionIdName);
        private Guid _userSessionId = _guestUserSessionId;

        #region DtoEFContextProvider

        // Hack: need to patch saveWorkState before letting save continue
        // TODO: record defect in OnTime and remove this hack when fixed
        private class DtoEFContextProvider : EFContextProvider<Northwind.Models.NorthwindContext>
        {
          protected override void SaveChangesCore(SaveWorkState saveWorkState)
          {
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

      public CustomerMapper(NorthwindDtoRepository repo)
      {
        this.repo = repo;
      }

      protected override Customer MapEntityToClient(Northwind.Models.Customer c)
      {
        // Incredibly inefficient if we save a lot of these customers at once but this is a demo
        // Usually would be dead simple if we didn't have to get the CustomerDTO.OrderCount
        var cust = repo.CustomerById(c.CustomerID);
        if (cust == null)
        {
          // assume was deleted; just send the minimum
          cust = new Customer
          {
            CustomerID = c.CustomerID,
            CompanyName = c.CompanyName           
          };
        }
        return cust;
      }

      protected override Northwind.Models.Customer MapEntityToServer(Customer c)
      {
        return new Northwind.Models.Customer
        {
          CustomerID  = c.CustomerID,
          CompanyName = c.CompanyName
        };
      }
    }
    #endregion 

    #region ProductMapper
    public class ProductMapper : EntitySaveMapper<Northwind.Models.Product, Product>
    {

      protected override Product MapEntityToClient(Northwind.Models.Product p) {
        return new Product
        {
          ProductID   = p.ProductID,
          ProductName = p.ProductName,
          CategoryID  = p.CategoryID,
          SupplierID  = p.SupplierID
        };
      }

      protected override Northwind.Models.Product MapEntityToServer(Product p) {
        return new Northwind.Models.Product
        {
          ProductID   = p.ProductID,
          ProductName = p.ProductName,
          CategoryID  = p.CategoryID,
          SupplierID  = p.SupplierID
        };
      }
    }
    #endregion
}