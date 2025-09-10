from locust import HttpUser, task, between

class MyUser(HttpUser):
    # Paramètres de temporisation entre les tâches
    wait_time = between(1, 5) # Attend entre 1 et 5 secondes entre chaque tâche
    host = "http://votresite.com" # Remplacez par l'URL du site à tester

    @task
    def connect(self):
        # Tâche : visiter la page d'accueil
        self.client.get("/")

    # Vous pouvez ajouter d'autres tâches pour simuler d'autres comportements
    # @task
    # def login(self):
    #     self.client.post("/login", {"username":"test", "password":"password"})