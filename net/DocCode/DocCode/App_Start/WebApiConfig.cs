using System.Web.Http;
using System.Web.Http.Cors;
using System.Web.Http.OData.Batch;

namespace DocCode
{
    public static class WebApiConfig
    {
        public static void Register(HttpConfiguration config)
        {
            // See http://www.asp.net/web-api/overview/security/enabling-cross-origin-requests-in-web-api
            // Let everybody in :-)
            var cors = new EnableCorsAttribute("*", "*", "*");
            config.EnableCors(cors);

            config.Routes.MapHttpRoute(
                name: "DefaultApi",
                routeTemplate: "api/{controller}/{id}",
                defaults: new { id = RouteParameter.Optional }
            );


            System.Web.Http.OData.Builder.ODataConventionModelBuilder builderV3 = new System.Web.Http.OData.Builder.ODataConventionModelBuilder();
            var entitySetConfigV3 = builderV3.EntitySet<IOZCustomer>("IOZCustomers");
            entitySetConfigV3.EntityType.HasKey(o => o.Id);

            config.Routes.MapODataRoute(
                routeName: "odata",
                routePrefix: "odata",
                model: builderV3.GetEdmModel(),
                batchHandler: new DefaultODataBatchHandler(GlobalConfiguration.DefaultServer));

        }
    }
}
