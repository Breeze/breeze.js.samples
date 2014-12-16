using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.Web.Http.ModelBinding;
using System.Web.Http.OData;
using System.Web.Http.OData.Query;
using System.Web.Http.OData.Routing;
using Northwind.Models;
using Microsoft.Data.OData;

namespace DocCode.Controllers
{
    /*
    The WebApiConfig class may require additional changes to add a route for this controller. Merge these statements into the Register method of the WebApiConfig class as applicable. Note that OData URLs are case sensitive.

    using System.Web.Http.OData.Builder;
    using System.Web.Http.OData.Extensions;
    using Northwind.Models;
    ODataConventionModelBuilder builder = new ODataConventionModelBuilder();
    builder.EntitySet<Customer>("IOZCustomers");
    config.Routes.MapODataServiceRoute("odata", "odata", builder.GetEdmModel());
    */
    public class IOZCustomersController : ODataController
    {
        private static IOZCustomer theCustomer;

        private static ODataValidationSettings _validationSettings = new ODataValidationSettings();

        public IQueryable<IOZCustomer> Get()
        {
            List<IOZCustomer> result = new List<IOZCustomer>();
            if (theCustomer == null)
            {
                theCustomer = new IOZCustomer()
                {
                    Name = "Customer 1",
                    Id = 1
                };
            }

            result.Add(theCustomer);
            return result.AsQueryable();
        }

        // POST: odata/IOZCustomers
        public IHttpActionResult Post(IOZCustomer customer)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            return StatusCode(HttpStatusCode.NotImplemented);
        }

        // PATCH: odata/IOZCustomers(5)
        [AcceptVerbs("PATCH", "MERGE")]
        public IHttpActionResult Patch([FromODataUri] int key, System.Web.Http.OData.Delta<IOZCustomer> delta)
        {
            var customer = delta.GetEntity();
            Validate(customer);

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            theCustomer.Name = customer.Name;

            return Updated(customer);
        }

        // DELETE: odata/IOZCustomers(5)
        public IHttpActionResult Delete([FromODataUri] int key)
        {
            return StatusCode(HttpStatusCode.NotImplemented);
        }
    }
}
