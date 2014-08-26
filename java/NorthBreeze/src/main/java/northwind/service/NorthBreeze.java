package northwind.service;

import javax.servlet.ServletContext;
import javax.ws.rs.BeanParam;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;

import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;

import northwind.model.Customer;
import northwind.model.Order;

import com.breezejs.OdataParameters;
import com.breezejs.Metadata;
import com.breezejs.hib.MetadataBuilder;
import com.breezejs.hib.QueryService;
import com.breezejs.hib.SaveService;
import com.breezejs.util.Json;

/**
 * NorthBreeze JAX-RS service returning JSON.
 * @author Steve
 * @see https://jersey.java.net/documentation/latest/jaxrs-resources.html
 */
@Path("northbreeze")
@Consumes("application/json")
@Produces("application/json; charset=UTF-8")
public class NorthBreeze {
	
	private QueryService queryService;
	private SaveService saveService;
	private Metadata metadata;
	private static String metadataJson; 
	
	/** Create instance using the injected ServletContext */
	public NorthBreeze(@Context ServletContext ctx) {
		this ((SessionFactory) ctx.getAttribute(AppContextListener.SESSIONFACTORY),
				(Metadata) ctx.getAttribute(AppContextListener.METADATA));
	}

	/** Create instance using provided sessionFactory and metadata.  This is private, just for testing */
	private NorthBreeze(SessionFactory sessionFactory, Metadata metadata) {
		System.out.println("NorthBreeze: sessionFactory=" + sessionFactory + ", metadata=" + metadata);
    	this.queryService = new QueryService(sessionFactory);
    	this.saveService = new SaveService(sessionFactory, metadata);
    	this.metadata = metadata;
	}
	
	@GET
	@Path("Metadata")
	public String getMetadata() {
		if (metadataJson == null) {
			metadataJson = Json.toJson(this.metadata, false, false);
		}
		return metadataJson;
	}
	
	@POST
	@Path("SaveChanges")
	public Response saveChanges(String saveBundle) {
		return saveService.saveChanges(saveBundle);
	}
	
	@GET
	@Path("Customers")
	public String getCustomers(@BeanParam OdataParameters odataParameters) {
		return queryService.queryToJson(Customer.class, odataParameters);
	}

	@GET
	@Path("Orders")
	public String getOrders(@BeanParam OdataParameters odataParameters) {
		return queryService.queryToJson(Order.class, odataParameters);
	}	  
	  
	/**
	 * Just for testing
	 * @param args
	 */
	public static void main(String[] args)
	{
		 // configures settings from hibernate.cfg.xml
		Configuration configuration = new Configuration();
		SessionFactory sessionFactory = configuration.configure().buildSessionFactory();
		
		// builds metadata from the Hibernate mappings
		MetadataBuilder metaGen = new MetadataBuilder(sessionFactory, configuration);
		Metadata metadata = metaGen.buildMetadata();
		
		NorthBreeze nb = new NorthBreeze(sessionFactory, metadata);
		String meta = nb.getMetadata();
		System.out.println(meta);
		System.exit(0);
	}
}
