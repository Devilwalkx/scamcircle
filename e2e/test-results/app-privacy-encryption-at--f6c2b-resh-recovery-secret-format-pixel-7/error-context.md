# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> privacy: encryption at rest, no network, no logs >> erase everything removes ciphertext and starts fresh; recovery secret format
- Location: tests/app.spec.ts:140:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Nothing here yet')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Nothing here yet') with timeout 5000ms
  - waiting for getByText('Nothing here yet')

```

```yaml
- heading "◯ ScamCircle" [level=1]
- text: Check a message. Then check it another way.
- alert: ⓘ Synthetic demonstration data. Nothing here is a real message, person or account.
- button "Check a message"
- button "My trusted people"
- button "Messages waiting for me"
- button "Settings and privacy"
- heading "Recent checks" [level=2]
- text: Message 1 ⚠ Warning signs
- button "Open"
- heading "Text size" [level=2]
- radiogroup:
  - radio "Normal"
  - radio "Large"
  - radio "Extra large"
```

# Test source

```ts
  52  |     await expect(page.getByRole("heading", { name: /We found \d+ warning/ })).toBeVisible();
  53  |     const vault = await page.evaluate(() => localStorage.getItem("sc.vault"));
  54  |     await expect(btn(page, "Ask someone I trust")).toBeVisible();
  55  |     await home(page);
  56  |     await btn(page, "My trusted people").click();
  57  |     await expect(page.getByText("No trusted people yet", { exact: false })).toBeVisible();
  58  |     expect(vault).not.toBeNull();
  59  |   });
  60  | 
  61  |   test("recording a check: a number from the message does not count; a saved contact does", async ({ page }) => {
  62  |     await open(page);
  63  |     await checkMessage(page, SCAM);
  64  |     await btn(page, "I checked it another way").click();
  65  |     await page.getByRole("radio", { name: /Called the number given in the message/ }).click();
  66  |     await page.getByRole("radio", { name: /The real person confirmed/ }).click();
  67  |     await btn(page, "Save").click();
  68  |     await expect(page.getByText("came from the message", { exact: false })).toBeVisible();
  69  |     await btn(page, "Back to the message").click();
  70  |     await btn(page, "I checked it another way").click();
  71  |     await page.getByRole("radio", { name: /Called a number I already had saved/ }).click();
  72  |     await page.getByRole("radio", { name: /did NOT send/ }).click();
  73  |     await btn(page, "Save").click();
  74  |     await expect(page.getByText("You checked this another way and got a clear answer", { exact: false })).toBeVisible();
  75  |     await btn(page, "Back to the message").click();
  76  |     await expect(page.getByText("Checked another way", { exact: false }).first()).toBeVisible();
  77  |   });
  78  | });
  79  | 
  80  | test.describe("privacy: encryption at rest, no network, no logs", () => {
  81  |   test("case content is encrypted in storage, reloads decrypt it, a lost key fails closed", async ({ page }) => {
  82  |     await open(page);
  83  |     await checkMessage(page, SCAM);
  84  |     const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
  85  |     expect(stored).toContain("sc.vault");
  86  |     for (const s of [MARK, "Don't tell Dad", "07700", "new number", '"text"', "xchacha"]) expect(stored, s).not.toContain(s);
  87  |     await page.reload();
  88  |     await expect(btn(page, "Open")).toBeVisible();
  89  |     await btn(page, "Open").click();
  90  |     await btn(page, "See what we noticed").click();
  91  |     await expect(page.getByText(MARK).first()).toBeVisible();
  92  |     await page.evaluate(() => new Promise<void>((res) => { const r = indexedDB.deleteDatabase("scamcircle-keys"); r.onsuccess = () => res(); r.onerror = () => res(); r.onblocked = () => res(); }));
  93  |     await page.reload();
  94  |     await expect(page.getByRole("heading", { name: "Your saved data could not be opened" })).toBeVisible();
  95  |     await expect(page.getByText(MARK)).toHaveCount(0);
  96  |   });
  97  | 
  98  |   test("no request leaves the app and no request or console line contains case content, across the whole flow", async ({ page, baseURL }) => {
  99  |     const seen: string[] = [];
  100 |     const external: string[] = [];
  101 |     page.on("request", (r) => {
  102 |       seen.push(r.url() + " " + (r.postData() ?? "") + JSON.stringify(r.headers()));
  103 |       if (!r.url().startsWith(baseURL!) && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) external.push(r.url());
  104 |     });
  105 |     const logs: string[] = [];
  106 |     page.on("console", (m) => logs.push(m.text()));
  107 |     page.on("pageerror", (e) => logs.push(String(e)));
  108 |     await open(page);
  109 |     await checkMessage(page, SCAM + " https://paypa1-help.com/login bit.ly/abc");
  110 |     await btn(page, "See what we noticed").click();
  111 |     await expect(page.getByText("Shortened link").first()).toBeVisible();
  112 |     await home(page);
  113 |     await btn(page, "Settings and privacy").click();
  114 |     await btn(page, "Demo options").click();
  115 |     await btn(page, "Load the example story").click();
  116 |     expect(external).toEqual([]);
  117 |     expect(seen.join("\n")).not.toContain(MARK);
  118 |     expect(seen.join("\n")).not.toMatch(/paypa1|07700|new%20number|Don't%20tell|Don%27t/i);
  119 |     expect(logs.join("\n")).not.toMatch(new RegExp(`${MARK}|07700|paypa1|Dad`));
  120 |   });
  121 | 
  122 |   test("links in a message are never opened", async ({ page, baseURL }) => {
  123 |     const hits: string[] = [];
  124 |     await page.route("**/*", (route) => { const u = route.request().url(); if (!u.startsWith(baseURL!) && !u.startsWith("data:")) hits.push(u); return route.continue(); });
  125 |     await open(page);
  126 |     await checkMessage(page, "Your parcel is held, pay the fee now at http://evri-parcel.example/pay or www.dpd-redelivery.info/x");
  127 |     await btn(page, "See what we noticed").click();
  128 |     await page.waitForTimeout(500);
  129 |     expect(hits).toEqual([]);
  130 |     await expect(page.locator("a[href]")).toHaveCount(0);
  131 |   });
  132 | 
  133 |   test("refuses to run without WebCrypto instead of storing unprotected", async ({ page }) => {
  134 |     await page.addInitScript(() => { Object.defineProperty(window.crypto, "subtle", { value: undefined, configurable: true }); });
  135 |     await page.goto("/");
  136 |     await expect(page.getByRole("heading", { name: "Cannot start safely" })).toBeVisible();
  137 |     expect(await page.evaluate(() => localStorage.length)).toBe(0);
  138 |   });
  139 | 
  140 |   test("erase everything removes ciphertext and starts fresh; recovery secret format", async ({ page }) => {
  141 |     await open(page);
  142 |     await checkMessage(page, SCAM);
  143 |     await home(page);
  144 |     await btn(page, "Settings and privacy").click();
  145 |     await btn(page, "Make a recovery secret").click();
  146 |     const s = page.getByLabel("Recovery secret, shown once");
  147 |     await expect(s).toBeVisible();
  148 |     expect((await s.innerText()).trim()).toMatch(/^([0-9A-Z]{4}-){12}[0-9A-Z]{4}$/);
  149 |     await btn(page, "Erase everything").click();
  150 |     await btn(page, "Yes, erase everything").click();
  151 |     await expect(btn(page, "Check a message")).toBeVisible();
> 152 |     await expect(page.getByText("Nothing here yet", { exact: false })).toBeVisible();
      |                                                                        ^ Error: expect(locator).toBeVisible() failed
  153 |     expect(await page.evaluate(() => localStorage.getItem("sc.recovery"))).toBeNull();
  154 |   });
  155 | 
  156 |   test("backup and restore bring a case back; a wrong secret is refused", async ({ page }) => {
  157 |     await open(page);
  158 |     await checkMessage(page, SCAM);
  159 |     await home(page);
  160 |     await btn(page, "Settings and privacy").click();
  161 |     await btn(page, "Make a recovery secret").click();
  162 |     const secret = (await page.getByLabel("Recovery secret, shown once").innerText()).trim();
  163 |     await btn(page, "Make a backup").click();
  164 |     await btn(page, "Make a backup").click();
  165 |     const backup = await code(page, "Backup text");
  166 |     expect(backup).not.toContain(MARK);
  167 |     await btn(page, "Back to settings").click();
  168 |     await btn(page, "Erase everything").click();
  169 |     await btn(page, "Yes, erase everything").click();
  170 |     await btn(page, "Settings and privacy").click();
  171 |     await btn(page, "Restore a backup").click();
  172 |     await page.getByLabel("Backup text").fill(backup);
  173 |     await page.getByLabel("Recovery secret", { exact: true }).fill("AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA");
  174 |     await btn(page, "Restore").click();
  175 |     await expect(page.getByText("does not open this backup", { exact: false })).toBeVisible();
  176 |     await page.getByLabel("Recovery secret", { exact: true }).fill(secret);
  177 |     await btn(page, "Restore").click();
  178 |     await expect(btn(page, "Settings and privacy")).toBeVisible();
  179 |     await expect(btn(page, "Open")).toBeVisible();
  180 |   });
  181 | });
  182 | 
  183 | test.describe("two phones: serverless sharing between two separate browser profiles", () => {
  184 |   async function phone(browser: Browser, name: string) {
  185 |     const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  186 |     const page = await ctx.newPage();
  187 |     await open(page);
  188 |     await btn(page, "My trusted people").click();
  189 |     await btn(page, "Add a person").click();
  190 |     await page.getByLabel("Your name, as they will see it").fill(name);
  191 |     await btn(page, "Save my name").click();
  192 |     return { ctx, page };
  193 |   }
  194 | 
  195 |   test("exchange codes, compare words, share a redacted case, reply, replay and unverified are refused", async ({ browser }, info) => {
  196 |     const A = await phone(browser, "Alice");
  197 |     const B = await phone(browser, "Bob");
  198 |     const aCode = await code(A.page, "Your contact code");
  199 |     const bCode = await code(B.page, "Your contact code");
  200 |     // each adds the other
  201 |     for (const [me, theirs] of [[A.page, bCode], [B.page, aCode]] as const) {
  202 |       await btn(me, "Next: paste their code").click();
  203 |       await me.getByLabel("Their contact code").fill(theirs);
  204 |       await btn(me, "Add this person").click();
  205 |       await expect(me.getByRole("heading", { name: /Is this really/ })).toBeVisible();
  206 |     }
  207 |     // before checking: unverified contacts cannot receive cases
  208 |     await shot(A.page, "verify", info);
  209 |     const wordsOf = async (p: Page) => (await p.getByLabel(/^Code words:/).first().getAttribute("aria-label"))!.replace("Code words: ", "");
  210 |     const aShowsForBob = await wordsOf(A.page);
  211 |     const bShowsForAlice = await wordsOf(B.page);
  212 |     await btn(A.page, "Not now").click();
  213 |     await btn(B.page, "Not now").click();
  214 |     // each phone shows its OWN words in "My code words": these must equal what the other phone computed
  215 |     const aOwn = await wordsOf(A.page), bOwn = await wordsOf(B.page);
  216 |     expect(aOwn).toBe(bShowsForAlice);
  217 |     expect(bOwn).toBe(aShowsForBob);
  218 |     // Alice tries to share before checking Bob's words
  219 |     await home(A.page);
  220 |     await checkMessage(A.page, SCAM);
  221 |     await btn(A.page, "Ask someone I trust").click();
  222 |     await expect(A.page.getByText("No trusted people yet", { exact: false })).toBeVisible();
  223 |     await expect(A.page.getByText("Not shown: Bob", { exact: false })).toBeVisible();
  224 |     await home(A.page);
  225 |     // verify on both
  226 |     for (const p of [A.page, B.page]) {
  227 |       await btn(p, "My trusted people").click();
  228 |       await btn(p, "Check their words").click();
  229 |       await btn(p, "Yes, they match").click();
  230 |       await expect(p.getByText("Words checked")).toBeVisible();
  231 |       await home(p);
  232 |     }
  233 |     // Alice shares, hiding the phone number
  234 |     await btn(A.page, "Open").click();
  235 |     await btn(A.page, "Ask someone I trust").click();
  236 |     await A.page.getByRole("radio", { name: /Bob/ }).click();
  237 |     await btn(A.page, "Next").click();
  238 |     await expect(A.page.getByText("They will see exactly this")).toBeVisible();
  239 |     await A.page.getByLabel("Hide another word or number").fill(MARK);
  240 |     await btn(A.page, "Hide it").click();
  241 |     await btn(A.page, "Next").click();
  242 |     await A.page.getByLabel("A note for them (optional)").fill("Is this really Sam?");
  243 |     await btn(A.page, "Review").click();
  244 |     await expect(A.page.getByText("exactly this", { exact: false }).first()).toBeVisible();
  245 |     await expect(A.page.getByText("Nothing is sent by this app", { exact: false })).toBeVisible();
  246 |     await btn(A.page, "Create the code").click();
  247 |     await expect(A.page.getByText("Not delivered yet", { exact: false })).toBeVisible();
  248 |     const share = await code(A.page, /Private code for Bob/);
  249 |     expect(share).not.toContain(MARK);
  250 |     await home(A.page);
  251 |     // Bob opens it
  252 |     await btn(B.page, "Messages waiting for me").click();
```