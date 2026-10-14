const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { test, before, after, beforeEach } = require("node:test");
const fs = require("node:fs");

let testEnv;
const PROJECT_ID = process.env.GCP_PROJECT || "demo-no-project";
const ALICE_UID = "alice_123";
const BOB_UID = "bob_456";

const [emulatorHost, emulatorPortStr] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085").split(":");
const emulatorPort = parseInt(emulatorPortStr, 10);

before(async () => {
  const rules = fs.readFileSync("./firestore.rules", "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: emulatorHost,
      port: emulatorPort,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

test("Unauthenticated user: cannot read customers", async () => {
  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(unauthDb.collection("users").doc(ALICE_UID).collection("customers").get());
});

test("Owner: can create and read customer profile", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("customers").doc("cust_101").set({
      userId: ALICE_UID,
      name: "Elegance Event Planners LLC",
      phone: "+1-555-432-1098",
      email: "contact@eleganceevents.com",
      address: "1200 Market Street Suite 400",
      company: "Elegance Event Planners",
      notes: "Prefers white drapery and gold chivari chairs. VIP client.",
      totalBookings: 8,
      totalSpent: 12500.0,
      createdAt: new Date(),
    })
  );

  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("customers").get()
  );
});

test("Owner: can create equipment with assetTag, warehouseLocation, and status", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("inventory").doc("item_201").set({
      userId: ALICE_UID,
      assetTag: "TAG-TNT-0042",
      name: "Marquee Canopy Tent 30x60",
      category: "Tents & Canopies",
      status: "AVAILABLE",
      warehouseLocation: "Bay 4, Rack 2B",
      totalQuantity: 2,
      availableQuantity: 2,
      rentalPricePerDay: 750.0,
      condition: "EXCELLENT",
      totalEventsUsed: 1,
      maintenanceIntervalEvents: 5,
      createdAt: new Date(),
    })
  );
});
