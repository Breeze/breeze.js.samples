using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;

namespace ODataBreezejsSample.Models
{
    public class TodoListContext : DbContext
    {
        static TodoListContext()
        {
            Database.SetInitializer(new TodoListContextInitializer());
        }

        public DbSet<TodoList> TodoLists { get; set; }
        public DbSet<TodoItem> TodoItems { get; set; }

        private class TodoListContextInitializer : DropCreateDatabaseAlways<TodoListContext>
        {
            protected override void Seed(TodoListContext context)
            {
                DateTime created = DateTime.UtcNow;
                var todoLists = new List<TodoList> ();
                string[] listTitles = { "A New List", "Work", "Band", "Home", "Wedding", "Other" };
                string[][] items = {
                    new string[] {},
                    new string[] {"Organise 1st 1000 unread emails", "Organise performance review", "Ignore performance review", "Fix coffee machine again"},  
                    new string[] {"Buy new drums", "Sack bass player", "Record album", "Release album", "Dominate world"}, 
                    new string[] {"Fix shower", "Paint decking", "Defrost ice box yet again"}, 
                    new string[] {"Go on stag", "Avoid monumental hangover on stag", "Buy suit", "Buy ring", "Avoid losing ring", "Write invites"},
                    new string[] {"Pick up laundry", "Fix car yet again"}
                };

                for (int i = 0; i < listTitles.Length; i++)
                {
                    var myList = new TodoList()
                    {
                        Id = i,
                        Title = listTitles[i],
                        Created = created,
                        TodoItems = new List<TodoItem>()
                    };
                    for (int j = 0; j < items[i].Length; j++)
			        {
                        myList.TodoItems.Add(new TodoItem()
                        {
                            Id = i * listTitles.Length + j,
                            Description = items[i][j],
                            IsDone = j % 5 == 0,
                            TodoListId = i
                        });
			        }

                    todoLists.Add(myList);
                }

                context.TodoLists.AddRange(todoLists);
            }
        }
    }
}