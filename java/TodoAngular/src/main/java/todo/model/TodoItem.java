package todo.model;

import java.util.Date;

public class TodoItem {
    private int id;
    private String description;
    private Date createdAt;
    private boolean isDone;
    private boolean isArchived;

	public int getId() {
		return id;
	}

	public void setId(int id) {
		this.id = id;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public Date getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(Date createdAt) {
		this.createdAt = createdAt;
	}

	public boolean getIsDone() {
		return isDone;
	}

	public void setIsDone(boolean isDone) {
		this.isDone = isDone;
	}
	
	public boolean getIsArchived() {
		return isArchived;
	}

	public void setIsArchived(boolean isArchived) {
		this.isArchived = isArchived;
	}
}
