using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using System.Web.Http.Cors;

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
        }
    }
}
