package todo.service;

import java.util.Calendar;
import java.util.Date;
import java.util.List;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.hibernate.Session;
import todo.model.TodoItem;

import com.breeze.webserver.BreezeControllerServlet;

public class TodoControllerServlet extends BreezeControllerServlet {
	private static final long serialVersionUID = 1L;
	
	public void ping(HttpServletRequest request, HttpServletResponse response) {
		writeResponse(response, "pong");
	}
	
	public void reset(HttpServletRequest request, HttpServletResponse response) {
		Session session = this._sessionFactory.openSession();
		session.beginTransaction();
		purgeDatabase(session);
		seedDatabase(session);
		session.getTransaction().commit();
		session.close();
		
		writeResponse(response, "reset");
	}
	
	public void purge(HttpServletRequest request, HttpServletResponse response) {	
		Session session = this._sessionFactory.openSession();
		session.beginTransaction();
		purgeDatabase(session);
		session.getTransaction().commit();
		session.close();
		
		writeResponse(response, "purged");
	}
	
	private void purgeDatabase(Session session) {		
		List todos = session.createCriteria(TodoItem.class).list();
		for(Object todo: todos) {
			session.delete(todo);
		}
	}
	
	private static void seedDatabase(Session session) {
		_calendar = Calendar.getInstance();
		_calendar.set(Calendar.YEAR, 2012);
		_calendar.set(Calendar.MONTH, 8);
		_calendar.set(Calendar.DATE, 22);
		_calendar.set(Calendar.HOUR, 9);
		_calendar.set(Calendar.MINUTE, 0);
		_calendar.set(Calendar.SECOND, 0);
		
		TodoItem[] todos = {
				// Description, IsDone, IsArchived
				createTodo("Food", true, true),
				createTodo("Water", true, true),
				createTodo("Shelter", true, true),
				createTodo("Bread", false, false),
				createTodo("Cheese", true, false),
				createTodo("Wine", false, false)
		};
		
		for(TodoItem newTodo: todos){
			session.save(newTodo);
		}
	}
	
	private static Date _baseCreatedAtDate;
	private static Calendar _calendar;
	
	private static TodoItem createTodo(String description, Boolean isDone, Boolean isArchived)
	{
		_calendar.add(Calendar.MINUTE, 1);
		_baseCreatedAtDate = _calendar.getTime();
		TodoItem newTodoItem = new TodoItem();
		newTodoItem.setCreatedAt(_baseCreatedAtDate);
		newTodoItem.setDescription(description);
		newTodoItem.setIsDone(isDone);
		newTodoItem.setIsArchived(isArchived);

		return newTodoItem;
	}

}