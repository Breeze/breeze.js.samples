using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Web.Http;
using System.Web.Http.OData;
using ODataTodo.Models;

namespace DocCode.Controllers
{
  /// <summary>
  /// OData controller for OData request tests
  /// </summary>
  /// <remarks>
  /// This implementation is currently entirely faked and does not persist.
  /// Future implementation could tie into the existing Todos test database
  /// </remarks>
  public class ODataTodosController : ODataController
  {
    // MUST BE CAREFUL IN MULTI-THREADED OF WEB API
    private static ODataTodoItem _todoItem = new ODataTodoItem
    {
      Id = 1,
      Description = "TodoItem 1"
    };
    private readonly Object _locker = new object();

    public IQueryable<ODataTodoItem> Get() {
      var result = new List<ODataTodoItem>();       

      lock (_locker)
      {
        result.Add(_todoItem);       
      }
      return result.AsQueryable();
    }

    public IHttpActionResult GetEntity(int key) {
      IHttpActionResult result;
      lock (_locker) {
        if (_todoItem.Id == key) {
          result = Ok(_todoItem);
        } else {
          result = NotFound();
        }
      }
      return result;
    }

    // POST: odata/ODataTodos
    public IHttpActionResult Post(ODataTodoItem todoItem) {
      if (!ModelState.IsValid) {
        return BadRequest(ModelState);
      }
      return StatusCode(HttpStatusCode.NotImplemented);
    }

    // PATCH: odata/ODataTodos(5)
    [AcceptVerbs("PATCH", "MERGE")]
    public IHttpActionResult Patch([FromODataUri] int key, Delta<ODataTodoItem> delta) {
      var todoItem = delta.GetEntity();
      Validate(todoItem);

      if (!ModelState.IsValid) {
        return BadRequest(ModelState);
      }
      lock (_locker)
      {
         _todoItem.Description = todoItem.Description;
      }
      return Updated(todoItem);
    }

    // DELETE: odata/ODataTodos(5)
    public IHttpActionResult Delete([FromODataUri] int key)
    {
      IHttpActionResult result;
      lock (_locker)
      {
        if (_todoItem.Id == key)
        {
          _todoItem.Id += 1; // so we have something to get next time 
          _todoItem.Description = "TodoItem 1" + _todoItem.Id; 
          result = StatusCode(HttpStatusCode.NoContent); 
        }
        else
        {
          result = NotFound();
        }
      }
      return result;
    }

    // RESET: odata/ODataTodos/Reset
    [HttpPost]
    public IHttpActionResult Reset() {
      IHttpActionResult result;
      if (!ModelState.IsValid) {
        return BadRequest();
      }

      lock (_locker) {
        _todoItem = new ODataTodoItem
        {
          Id = 1,
          Description = "TodoItem 1"
        };
        result = Ok("OData Todos reset");
      }
      return result;
    }
  }
}