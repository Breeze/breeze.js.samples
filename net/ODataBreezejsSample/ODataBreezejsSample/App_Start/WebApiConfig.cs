using Microsoft.Data.Edm;
using ODataBreezejsSample.Models;
using System.Web.Http;
using System.Web.Http.OData.Batch;

namespace ODataBreezejsSample
{
    public static class WebApiConfig
    {
        public static void Register(HttpConfiguration config)
        {
            // Web API configuration and services

            // Web API routes
            config.MapHttpAttributeRoutes();

            config.Routes.MapODataRoute(
                routeName: "odata", 
                routePrefix: "odata",
                model: EdmBuilder.GetEdm<TodoListContext>(), 
                batchHandler: new DefaultODataBatchHandler(GlobalConfiguration.DefaultServer)
                );


            config.Routes.MapHttpRoute(
                name: "DefaultApi",
                routeTemplate: "api/{controller}/{id}",
                defaults: new { id = RouteParameter.Optional }
            );

            // Only used by TestController
            config.Routes.MapHttpRoute(
                name: "BreezeApi",
                routeTemplate: "breeze/{controller}/{action}"
            );
        }
    }
}
