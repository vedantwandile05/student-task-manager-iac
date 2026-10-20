terraform {
  cloud {
    organization = "vedant-projects"
    workspaces {
      name = "student-task-manager"
    }
  }
}
