using System.Web.Http;
using System.Web.Http.Cors;

[assembly: WebActivatorEx.PreApplicationStartMethod(
    typeof(Breeze.WebApi.BreezeSimpleCorsHandler), "Start")]
namespace Breeze.WebApi
{
  /// <summary>
  /// Enable unfettered CORS support (Development Only)
  /// </summary>
  /// <remarks>
  /// Simple-minded, allow-everything, CORS (Cross-origin resource sharing)
  /// http://en.wikipedia.org/wiki/Cross-origin_resource_sharing
  /// Accepts any request for any action from any site
  /// Warning: Do not use for production code. Use as inspiration for a
  /// solution that is consistent with your security requirements.
  /// </remarks>
  public static class BreezeSimpleCorsHandler
  {
    public static void Start() {
      // See http://www.asp.net/web-api/overview/security/enabling-cross-origin-requests-in-web-api
      // Let everybody in :-)
      var cors = new EnableCorsAttribute("*", "*", "*");
      GlobalConfiguration.Configuration.EnableCors(cors);
    }
  }
}