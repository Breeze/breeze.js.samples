package northwind.service;

import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.annotation.WebListener;

import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;

import com.breezejs.Metadata;
import com.breezejs.hib.MetadataBuilder;

@WebListener
public class AppContextListener implements ServletContextListener {
	
	public static final String SESSIONFACTORY = "sessionFactory";
	public static final String METADATA = "metadata";

	@Override
	public void contextInitialized(ServletContextEvent sce) {

		System.out.println("AppContextListener.contextInitialized begin");
		 // configures settings from hibernate.cfg.xml
		Configuration configuration = new Configuration();
		SessionFactory sessionFactory = configuration.configure().buildSessionFactory();
		System.out.println("AppContextListener.contextInitialized: sessionFactory=" + sessionFactory);
		
		// builds metadata from the Hibernate mappings
		MetadataBuilder metaGen = new MetadataBuilder(sessionFactory, configuration);
		Metadata metadata = metaGen.buildMetadata();
		System.out.println("AppContextListener.contextInitialized: metadata=" + metadata);

		// Set the values in the context so they can be used in the NorthBreeze service class
		ServletContext ctx = sce.getServletContext();
		ctx.setAttribute(SESSIONFACTORY, sessionFactory);
		ctx.setAttribute(METADATA, metadata);
	}

	@Override
	public void contextDestroyed(ServletContextEvent sce) {
		// Clean up when the app is shut down
		ServletContext ctx = sce.getServletContext();
		SessionFactory sessionFactory = (SessionFactory) ctx.getAttribute(SESSIONFACTORY);
		if (sessionFactory != null) {
			sessionFactory.close();
		}

	}

}
