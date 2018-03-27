import * as fs from "fs-extra";
import * as path from "path";
import * as _ from "underscore";
// tslint:disable-next-line:no-var-requires
const cliPackageJson = require(__dirname + "/../package.json");

export const packageNames = [
    "smallstack-api-server",
    "smallstack-apps",
    "smallstack-backoffice-client",
    "smallstack-backoffice-server",
    "smallstack-cloud-cms",
    "smallstack-cms-client",
    "smallstack-cms-common",
    "smallstack-cms-server",
    "smallstack-common",
    "smallstack-components",
    "smallstack-components-angular",
    "smallstack-email",
    "smallstack-files",
    "smallstack-frontend-common",
    "smallstack-frontend-meteor",
    "smallstack-frontend-nativescript",
    "smallstack-frontend-web",
    "smallstack-i18n",
    "smallstack-oms-common",
    "smallstack-oms-server",
    "smallstack-push-notifications",
    "smallstack-server-meteor",
    "smallstack-testing",
    "smallstack-typesystem-generator",
    "smallstack-user",
    "smallstack-workflow"
];

export class Config {

    public static frontendSmallstackDatalayerDirectory: string;
    public static frontendSmallstackFrontendDirectory: string;
    public static frontendSmallstackCoreCommonDirectory: string;
    public static frontendSmallstackCoreClientDirectory: string;
    public static frontendDirectory: string;
    public static nativescriptDatalayerDirectory: string;
    public static nativescriptSmallstackNativescriptDirectory: string;
    public static nativescriptSmallstackCoreCommonDirectory: string;
    public static nativescriptSmallstackCoreClientDirectory: string;
    public static nativescriptDirectory: string;
    public static datalayerTemplatesPath: string;
    public static cliTemplatesPath: string;
    public static cliResourcesPath: string;
    public static datalayerSmallstackCoreCommonDirectory: string;
    public static datalayerPath: string;
    public static meteorDatalayerPath: string;
    public static meteorSmallstackMeteorCommonDirectory: string;
    public static meteorSmallstackMeteorServerDirectory: string;
    public static meteorSmallstackMeteorClientDirectory: string;
    public static meteorSmallstackCoreCommonDirectory: string;
    public static meteorSmallstackCoreServerDirectory: string;
    public static meteorSmallstackCoreClientDirectory: string;
    public static meteorSmallstackDependenciesDirectory: string;
    public static smallstackDirectory: string;
    public static meteorTestsDirectory: string;
    public static meteorDirectory: string;
    public static builtDirectory: string;
    public static rootDirectory: string;
    public static tmpDirectory: string;

    public static cli: any = cliPackageJson;
    public static project: any;

    public static init() {
        try {
            this.rootDirectory = this.getRootDirectory();

            if (this.rootDirectory) {
                this.tmpDirectory = path.join(this.rootDirectory, "tmp");
                if (this.isProjectEnvironment()) {
                    this.builtDirectory = path.join(this.rootDirectory, "built");
                    this.meteorDirectory = path.join(this.rootDirectory, "meteor");
                    this.meteorTestsDirectory = path.join(this.meteorDirectory, "tests");
                    this.smallstackDirectory = path.join(this.rootDirectory, "smallstack");
                    this.meteorSmallstackDependenciesDirectory = path.join(this.meteorDirectory, "node_modules", "@smallstack");
                    this.meteorSmallstackCoreClientDirectory = path.join(this.meteorSmallstackDependenciesDirectory, "core-client");
                    this.meteorSmallstackCoreServerDirectory = path.join(this.meteorSmallstackDependenciesDirectory, "core-server");
                    this.meteorSmallstackCoreCommonDirectory = path.join(this.meteorSmallstackDependenciesDirectory, "core-common");
                    this.meteorSmallstackMeteorClientDirectory = path.join(this.meteorSmallstackDependenciesDirectory, "meteor-client");
                    this.meteorSmallstackMeteorServerDirectory = path.join(this.meteorSmallstackDependenciesDirectory, "meteor-server");
                    this.meteorSmallstackMeteorCommonDirectory = path.join(this.meteorSmallstackDependenciesDirectory, "meteor-common");
                    this.meteorDatalayerPath = path.join(this.meteorSmallstackDependenciesDirectory, "datalayer");
                    this.datalayerPath = path.join(this.rootDirectory, "datalayer");
                    this.datalayerSmallstackCoreCommonDirectory = path.join(this.datalayerPath, "node_modules", "@smallstack/core-common");
                    this.cliResourcesPath = path.join(this.smallstackDirectory, "resources");
                    this.cliTemplatesPath = path.join(this.cliResourcesPath, "templates");
                    this.datalayerTemplatesPath = path.join(this.cliTemplatesPath, "datalayer");

                    if (this.projectHasNativescriptApp()) {
                        this.nativescriptDirectory = path.join(this.rootDirectory, "nativescript-app");
                        this.nativescriptSmallstackCoreClientDirectory = path.join(this.rootDirectory, "nativescript-app", "node_modules", "@smallstack/core-client");
                        this.nativescriptSmallstackCoreCommonDirectory = path.join(this.rootDirectory, "nativescript-app", "node_modules", "@smallstack/core-common");
                        this.nativescriptDatalayerDirectory = path.join(this.rootDirectory, "nativescript-app", "node_modules", "@smallstack/datalayer");
                    }
                    if (this.projectHasFrontend()) {
                        this.frontendDirectory = path.join(this.rootDirectory, "frontend");
                        this.frontendSmallstackCoreClientDirectory = path.join(this.frontendDirectory, "node_modules", "@smallstack", "core-client");
                        this.frontendSmallstackCoreCommonDirectory = path.join(this.frontendDirectory, "node_modules", "@smallstack", "core-common");
                        this.frontendSmallstackFrontendDirectory = path.join(this.frontendDirectory, "node_modules", "@smallstack", "frontend");
                        this.frontendSmallstackDatalayerDirectory = path.join(this.frontendDirectory, "node_modules", "@smallstack", "datalayer");
                    }
                }
                if (this.isSmallstackEnvironment()) {
                    this.cliResourcesPath = path.join(this.rootDirectory, "", "resources");
                    this.cliTemplatesPath = path.join(this.cliResourcesPath, "templates");
                    this.datalayerTemplatesPath = path.join(this.cliTemplatesPath, "datalayer");
                }
                if (this.isComponentEnvironment()) {
                    this.smallstackDirectory = path.join(this.rootDirectory, "smallstack");
                }
            }

            if (fs.existsSync(this.rootDirectory + "/package.json")) {
                this.project = require(this.rootDirectory + "/package.json");
                _.extend(this, require(this.rootDirectory + "/package.json"));
            }
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Determines how a project can be found
     */
    public static projectFound(directory) {
        try {
            if (directory === undefined)
                directory = this.getRootDirectory();
            const meteorPackagesFilePath = path.join(directory, "meteor", ".meteor", "packages");
            return fs.existsSync(meteorPackagesFilePath);
        } catch (e) {
            return false;
        }
    }

    public static emptyDirectory(directory) {
        try {
            if (fs.readdirSync(directory).length === 0)
                return directory;
        } catch (e) {
            return false;
        }
    }


    public static checkModule(modulePath, name) {
        if (!fs.existsSync(modulePath))
            return false;
        const packageContent = require(modulePath);
        return packageContent.name === name;
    }



    public static smallstackFound(directory) {
        try {
            // core common module available?
            if (this.checkModule(path.join(directory, "modules", "core-common", "package.json"), "@smallstack/core-common"))
                return true;
        } catch (e) {
            return false;
        }
    }

    public static smallstackModuleFound(directory) {
        try {
            if (this.checkModule(path.join(directory, "package.json"), "@smallstack/core-common"))
                return true;
            if (this.checkModule(path.join(directory, "package.json"), "@smallstack/core-client"))
                return true;
            if (this.checkModule(path.join(directory, "package.json"), "@smallstack/core-server"))
                return true;
            if (this.checkModule(path.join(directory, "package.json"), "@smallstack/meteor-common"))
                return true;
            if (this.checkModule(path.join(directory, "package.json"), "@smallstack/meteor-client"))
                return true;
            if (this.checkModule(path.join(directory, "package.json"), "@smallstack/meteor-server"))
                return true;
        } catch (e) {
            return false;
        }
    }

    public static smallstackComponentFound(directory) {
        if (!directory)
            return false;
        const packageJSONPath = path.join(directory, "package.json");
        if (!fs.existsSync(packageJSONPath))
            return false;
        const packageContent = require(packageJSONPath);
        try {
            if (packageContent.smallstack.component.nativescript)
                return true;
            if (packageContent.smallstack.component.web)
                return true;
            if (packageContent.smallstack.component.server)
                return true;
        } catch (e) {
            // shit happens
        }
        return false;
    }

    public static nativescriptAppFound(directory) {
        if (!directory)
            return false;
        const packageJSONPath = path.join(directory, "package.json");
        if (!fs.existsSync(packageJSONPath))
            return false;
        const packageContent = require(packageJSONPath);
        return packageContent.nativescript !== undefined && packageContent.nativescript.id !== undefined;
    }

    public static npmPackageFound(directory) {
        if (!directory)
            return false;
        const packageJSONPath = path.join(directory, "package.json");
        if (!fs.existsSync(packageJSONPath))
            return false;
        const packageContent = require(packageJSONPath);
        return packageContent.name !== undefined;
    }

    public static workspaceFound(directory) {
        if (!directory)
            return false;
        const workspacePath = path.join(directory, "smallstack-products.code-workspace");
        return fs.existsSync(workspacePath);
    }

    public static multiNPMPackageFound(directory) {
        const rootDirectories: string[] = fs.readdirSync(directory).map((name) => path.join(directory, name)).filter((source) => fs.lstatSync(source).isDirectory());
        for (const d of rootDirectories) {
            if (this.npmPackageFound(d))
                return true;
        }
        return false;
    }

    public static isEmptyDirectoryEnvironment() {
        return this.emptyDirectory(this.getRootDirectory());
    }

    public static isWorkspaceEnvironment() {
        return this.workspaceFound(this.getRootDirectory());
    }

    public static isSmallstackEnvironment() {
        return this.smallstackFound(this.getRootDirectory());
    }

    public static isProjectEnvironment() {
        return this.projectFound(this.getRootDirectory());
    }

    public static isComponentEnvironment() {
        return this.smallstackComponentFound(this.getRootDirectory());
    }

    public static isNativescriptEnvironment() {
        return this.nativescriptAppFound(this.getRootDirectory());
    }

    public static isNPMPackageEnvironment() {
        return this.npmPackageFound(this.getRootDirectory());
    }

    public static isMultiNPMPackageEnvironment() {
        return this.multiNPMPackageFound(this.getRootDirectory());
    }

    public static calledWithCreateProjectCommand() {
        return process.argv[2] === "create" && process.argv[2] !== undefined;
    }


    public static calledWithNonProjectCommand() {
        return process.argv[2] === "compileNpmModule";
    }

    public static meteorProjectAvailable() {
        return fs.existsSync(this.meteorDirectory);
    }

    public static smallstackDirectoryAvailable() {
        return fs.existsSync(this.smallstackDirectory);
    }

    public static projectHasNativescriptApp() {
        return fs.existsSync(path.join(this.getRootDirectory(), "nativescript-app"));
    }

    public static projectHasFrontend() {
        return fs.existsSync(path.join(this.getRootDirectory(), "frontend"));
    }

    public static projectHasDatalayerNG() {
        const datalayerPackageJSON = require(path.join(this.datalayerPath, "package.json"));
        if (!datalayerPackageJSON)
            throw new Error("No datalayer/package.json found!");
        return datalayerPackageJSON.smallstack && datalayerPackageJSON.smallstack.typesystem !== undefined;
    }

    public static getModuleNames(): string[] {
        if (!this.isSmallstackEnvironment())
            throw new Error("this is not a smallstack module environment!");

        // this is static and should be changed if new products have arrived
        return ["core-common", "core-client", "core-server", "meteor-client", "meteor-server", "meteor-common"];
    }

    public static getRootDirectory() {

        let root = path.resolve("./");
        try {
            for (let tryIt = 0; tryIt < 15; tryIt++) {
                if (this.emptyDirectory(root))
                    return root;
                if (this.projectFound(root))
                    return root;
                if (this.smallstackFound(root))
                    return root;
                if (this.workspaceFound(root))
                    return root;
                if (this.npmPackageFound(root))
                    return root;
                if (this.multiNPMPackageFound(root))
                    return root;
                if (this.nativescriptAppFound(root))
                    return root;
                if (this.smallstackComponentFound(root))
                    return root;

                root = path.resolve(path.join(root, "../"));
            }
        } catch (e) {
            throw new Error("No suitable environment found! The smallstack CLI only works inside smallstack projects, smallstack module folders or nativescript apps!");
        }

        // just a directory
        return path.resolve("./");
    }

    public static isCIMode() {
        return process.env.CI !== undefined;
    }

}

Config.init();
