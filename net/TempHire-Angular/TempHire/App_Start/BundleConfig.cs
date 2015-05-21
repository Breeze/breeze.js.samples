using System;
using System.Web.Optimization;

namespace TempHire
{
    public class BundleConfig
    {
        public static void RegisterBundles(BundleCollection bundles)
        {
            bundles.IgnoreList.Clear();
            AddDefaultIgnorePatterns(bundles.IgnoreList);

            bundles.Add(
              new ScriptBundle("~/scripts/vendor")
                .Include("~/scripts/jquery-{version}.js")
                //.Include("~/scripts/knockout-{version}.debug.js")
                //.Include("~/scripts/sammy-{version}.js")
                //.Include("~/scripts/toastr-{version}.js")
                .Include("~/scripts/toastr.js")
                //.Include("~/scripts/Q.js")
                .Include("~/scripts/breeze.debug.js")
                .Include("~/scripts/bootstrap.js")
                .Include("~/scripts/moment.js")
              );

            bundles.Add(
              new ScriptBundle("~/scripts/angular")
                .Include("~/scripts/angular/angular.js")
                .Include("~/scripts/angular-ui/ui-bootstrap-tpls.js")
                .Include("~/scripts/angular/router.es5.js")
                .Include("~/scripts/breeze.bridge.angular.js")
              );

            bundles.Add(
              new StyleBundle("~/Content/css")
                .Include("~/Content/ie10mobile.css")
                .Include("~/Content/bootstrap.css")
                .Include("~/Content/bootstrap-responsive.css")
                .Include("~/Content/durandal.css")
                .Include("~/Content/toastr.css")
                .Include("~/Content/app.css")
              );

            bundles.Add(
                new ScriptBundle("~/scripts/app")
                    .Include("~/App/main.js")
                    .Include("~/App/model/modelBuilder.js")
                    .Include("~/App/services/utilities.js")
                    .Include("~/App/services/logger.js")
                    .Include("~/App/services/errorhandler.js")
                    .Include("~/App/services/eventaggregator.js")
                    .Include("~/App/services/account.js")
                    .Include("~/App/services/entitymanagerprovider.js")
                    .Include("~/App/services/repository.js")
                    .Include("~/App/services/unitofwork.js")
                    .Include("~/App/services/messagebox.js")
                    .Include("~/App/components/shell/shell.js")
                    .Include("~/App/components/login/login.js")
                    .Include("~/App/components/home/home.js")
                    .Include("~/App/components/resourcemgt/resourcemgt.js")
                    .Include("~/App/components/details/details.js")
                    .Include("~/App/components/details/nameeditor.js")
                    .Include("~/App/components/contacts/contacts.js")
                    .Include("~/App/components/contacts/optionselector.js")
            );
        }

        public static void AddDefaultIgnorePatterns(IgnoreList ignoreList)
        {
            if (ignoreList == null)
            {
                throw new ArgumentNullException("ignoreList");
            }

            ignoreList.Ignore("*.intellisense.js");
            ignoreList.Ignore("*-vsdoc.js");

            //ignoreList.Ignore("*.debug.js", OptimizationMode.WhenEnabled);
            //ignoreList.Ignore("*.min.js", OptimizationMode.WhenDisabled);
            //ignoreList.Ignore("*.min.css", OptimizationMode.WhenDisabled);
        }
    }
}