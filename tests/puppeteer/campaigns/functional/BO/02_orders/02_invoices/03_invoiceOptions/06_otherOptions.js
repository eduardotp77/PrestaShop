require('module-alias/register');
// Using chai
const {expect} = require('chai');
const helper = require('@utils/helpers');
const loginCommon = require('@commonTests/loginBO');
const files = require('@utils/files');

// Importing pages
const LoginPage = require('@pages/BO/login');
const DashboardPage = require('@pages/BO/dashboard');
const InvoicesPage = require('@pages/BO/orders/invoices/index');
const OrdersPage = require('@pages/BO/orders/index');
const ViewOrderPage = require('@pages/BO/orders/view');
const FOBasePage = require('@pages/FO/FObasePage');
const HomePage = require('@pages/FO/home');
const FOLoginPage = require('@pages/FO/login');
const ProductPage = require('@pages/FO/product');
const CartPage = require('@pages/FO/cart');
const CheckoutPage = require('@pages/FO/checkout');
const OrderConfirmationPage = require('@pages/FO/checkout/orderConfirmation');

// Importing data
const {PaymentMethods} = require('@data/demo/paymentMethods');
const {DefaultAccount} = require('@data/demo/customer');
const {Statuses} = require('@data/demo/orderStatuses');
const InvoiceOptionFaker = require('@data/faker/invoice');

// Test context imports
const testContext = require('@utils/testContext');

const baseContext = 'functional_BO_orders_invoices_invoiceOptions_otherOptions';

let browser;
let page;

let invoiceData;
let fileName;

// Init objects needed
const init = async function () {
  return {
    loginPage: new LoginPage(page),
    dashboardPage: new DashboardPage(page),
    invoicesPage: new InvoicesPage(page),
    ordersPage: new OrdersPage(page),
    viewOrderPage: new ViewOrderPage(page),
    foBasePage: new FOBasePage(page),
    homePage: new HomePage(page),
    foLoginPage: new FOLoginPage(page),
    productPage: new ProductPage(page),
    cartPage: new CartPage(page),
    checkoutPage: new CheckoutPage(page),
    orderConfirmationPage: new OrderConfirmationPage(page),
  };
};

/*
Edit Invoice number, Footer text
Create order
Change the Order status to Shipped
Check the invoice file name
 */
describe('Edit \'Invoice number, Footer text\' and check the generated invoice file', async () => {
  // before and after functions
  before(async function () {
    browser = await helper.createBrowser();
    page = await helper.newTab(browser);
    await helper.setDownloadBehavior(page);

    this.pageObjects = await init();

    invoiceData = await (new InvoiceOptionFaker());
  });
  after(async () => {
    // Delete the invoice file
    await files.deleteFile(`${global.BO.DOWNLOAD_PATH}/${fileName}.pdf`);
    await helper.closeBrowser(browser);
  });

  // Login into BO
  loginCommon.loginBO();

  describe('Edit the Invoice number and Footer text', async () => {
    it('should go to invoices page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToInvoicesPageToEditOptions', baseContext);

      await this.pageObjects.dashboardPage.goToSubMenu(
        this.pageObjects.dashboardPage.ordersParentLink,
        this.pageObjects.dashboardPage.invoicesLink,
      );

      await this.pageObjects.invoicesPage.closeSfToolBar();

      const pageTitle = await this.pageObjects.invoicesPage.getPageTitle();
      await expect(pageTitle).to.contains(this.pageObjects.invoicesPage.pageTitle);
    });

    it('should change the Invoice numberFooter text', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'updateOptions', baseContext);

      await this.pageObjects.invoicesPage.setInputOptions(invoiceData);
      const textMessage = await this.pageObjects.invoicesPage.saveInvoiceOptions();
      await expect(textMessage).to.contains(this.pageObjects.invoicesPage.successfulUpdateMessage);
    });
  });

  describe('Create new order in FO', async () => {
    it('should go to FO page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToFO', baseContext);

      // Click on view my shop
      page = await this.pageObjects.invoicesPage.viewMyShop();
      this.pageObjects = await init();

      // Change language on FO
      await this.pageObjects.homePage.changeLanguage('en');

      const isHomePage = await this.pageObjects.homePage.isHomePage();
      await expect(isHomePage, 'Fail to open FO home page').to.be.true;
    });

    it('should go to login page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToLoginFO', baseContext);

      await this.pageObjects.homePage.goToLoginPage();

      const pageTitle = await this.pageObjects.foLoginPage.getPageTitle();
      await expect(pageTitle, 'Fail to open FO login page').to.contains(this.pageObjects.foLoginPage.pageTitle);
    });

    it('should sign in with default customer', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'sighInFO', baseContext);

      await this.pageObjects.foLoginPage.customerLogin(DefaultAccount);

      const isCustomerConnected = await this.pageObjects.foLoginPage.isCustomerConnected();
      await expect(isCustomerConnected, 'Customer is not connected').to.be.true;
    });

    it('should create an order', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'createOrder', baseContext);

      // Go to home page
      await this.pageObjects.foLoginPage.goToHomePage();

      // Go to the first product page
      await this.pageObjects.homePage.goToProductPage(1);

      // Add the created product to the cart
      await this.pageObjects.productPage.addProductToTheCart();

      // Proceed to checkout the shopping cart
      await this.pageObjects.cartPage.clickOnProceedToCheckout();

      // Address step - Go to delivery step
      const isStepAddressComplete = await this.pageObjects.checkoutPage.goToDeliveryStep();
      await expect(isStepAddressComplete, 'Step Address is not complete').to.be.true;

      // Delivery step - Go to payment step
      const isStepDeliveryComplete = await this.pageObjects.checkoutPage.goToPaymentStep();
      await expect(isStepDeliveryComplete, 'Step Address is not complete').to.be.true;

      // Payment step - Choose payment step
      await this.pageObjects.checkoutPage.choosePaymentAndOrder(PaymentMethods.wirePayment.moduleName);

      // Check the confirmation message
      const cardTitle = await this.pageObjects.orderConfirmationPage.getOrderConfirmationCardTitle();
      await expect(cardTitle).to.contains(this.pageObjects.orderConfirmationPage.orderConfirmationCardTitle);
    });

    it('should sign out from FO', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'sighOutFO', baseContext);

      await this.pageObjects.orderConfirmationPage.logout();
      const isCustomerConnected = await this.pageObjects.orderConfirmationPage.isCustomerConnected();
      await expect(isCustomerConnected, 'Customer is connected').to.be.false;
    });

    it('should go back to BO', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goBackToBo', baseContext);

      page = await this.pageObjects.orderConfirmationPage.closePage(browser, 1);
      this.pageObjects = await init();
      const pageTitle = await this.pageObjects.invoicesPage.getPageTitle();
      await expect(pageTitle).to.contains(this.pageObjects.invoicesPage.pageTitle);
    });
  });

  describe('Create an invoice and check the edited data', async () => {
    it('should go to the orders page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToOrdersPageUpdatedOptions', baseContext);

      await this.pageObjects.invoicesPage.goToSubMenu(
        this.pageObjects.invoicesPage.ordersParentLink,
        this.pageObjects.invoicesPage.ordersLink,
      );

      const pageTitle = await this.pageObjects.ordersPage.getPageTitle();
      await expect(pageTitle).to.contains(this.pageObjects.ordersPage.pageTitle);
    });

    it('should go to the first order page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToFirstOrderPageUpdatedOptions', baseContext);

      await this.pageObjects.ordersPage.goToOrder(1);
      const pageTitle = await this.pageObjects.viewOrderPage.getPageTitle();
      await expect(pageTitle).to.contains(this.pageObjects.viewOrderPage.pageTitle);
    });

    it(`should change the order status to '${Statuses.shipped.status}'`, async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'updateStatusUpdatedOptions', baseContext);

      const result = await this.pageObjects.viewOrderPage.modifyOrderStatus(Statuses.shipped.status);
      await expect(result).to.equal(Statuses.shipped.status);
    });

    it('should download the invoice', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'downloadInvoiceUpdatedOptions', baseContext);

      // Get invoice name
      fileName = await this.pageObjects.viewOrderPage.getFileName();

      // Download invoice
      await this.pageObjects.viewOrderPage.downloadInvoice();

      const exist = await files.doesFileExist(`${fileName}.pdf`);
      await expect(exist).to.be.true;
    });

    it('should check that the invoice file name contain the \'Invoice number\'', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'checkUpdatedInvoiceNumber', baseContext);

      // Get file name
      fileName = await this.pageObjects.viewOrderPage.getFileName();
      expect(fileName).to.contains(invoiceData.invoiceNumber);
    });

    it('should check that the invoice contain the \'Footer text\'', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'checkUpdatedFooterText', baseContext);

      // Check the existence of the Footer text
      const exist = await files.isTextInPDF(`${fileName}.pdf`, invoiceData.footerText);
      await expect(exist, `PDF does not contains this text : ${invoiceData.footerText}`).to.be.true;
    });
  });
});
