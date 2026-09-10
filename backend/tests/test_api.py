import unittest
from fastapi.testclient import TestClient

from app.main import app


class TestCRMAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_list_leads(self):
        response = self.client.get("/api/leads")
        self.assertEqual(response.status_code, 200)
        leads = response.json()
        self.assertIsInstance(leads, list)
        self.assertGreater(len(leads), 0)

    def test_get_lead_detail(self):
        response = self.client.get("/api/leads/1")
        self.assertEqual(response.status_code, 200)
        lead = response.json()
        self.assertEqual(lead["id"], 1)
        self.assertIn("full_name", lead)

    def test_get_lead_not_found(self):
        response = self.client.get("/api/leads/99999")
        self.assertEqual(response.status_code, 404)

    def test_activity_empty_content_validation(self):
        response = self.client.post(
            "/api/leads/1/activities",
            json={"type": "note", "content": "   "},
        )
        self.assertEqual(response.status_code, 400)

    def test_deal_invalid_stage_validation(self):
        response = self.client.patch(
            "/api/deals/1",
            json={"stage": "invalid_stage"},
        )
        self.assertEqual(response.status_code, 422)

    def test_list_tasks(self):
        response = self.client.get("/api/leads/1/tasks")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)


if __name__ == "__main__":
    unittest.main()
