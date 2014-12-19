using System.Web.Http;
using System.Web.Http.OData.Batch;
using System.Web.Http.OData.Builder;
using System.Web.Http.OData.Extensions;
using ODataTodo.Models;

[assembly: WebActivatorEx.PreApplicationStartMethod(
  typeof(DocCode.App_Start.ODataWebApiConfig), "PreStart")]
namespace DocCode.App_Start 
{
  public class ODataWebApiConfig
  { 
    public static void PreStart() {

      var builderV3 = new ODataConventionModelBuilder();
      var entitySetConfigV3 = builderV3.EntitySet<ODataTodoItem>("ODataTodos");
      entitySetConfigV3.EntityType.HasKey(t => t.Id);

      // Add the reset action to the EDM
      var reset = builderV3.Entity<ODataTodoItem>().Collection.Action("Reset");
      reset.Returns<string>();

      GlobalConfiguration.Configuration.Routes.MapODataServiceRoute(
        routeName: "odata",
        routePrefix: "odata",
        model: builderV3.GetEdmModel(),
        batchHandler: new DefaultODataBatchHandler(GlobalConfiguration.DefaultServer));

    }
  }
}
