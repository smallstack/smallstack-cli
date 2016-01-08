/**
 * A very simple ioc
 * @class IOC
 */
class IOC {
    private container: { [id: string]: Object } = {};

    /**
    * Registers a service/factory
    * 
    * @param {string} id The identifier of the service/factory
    * @param {object} value The instance/constructor of the service/factory
    */
    public register(id: string, value: Object): void {
        this.container[id] = value;
        console.log("ioc -> registered : " + id);
    }
    
    /**
    * Gets a service/factory by id
    * 
    * @param {string} id The identifier of the service/factory to get
    * @return {object} The instance/constructor of the service/factory
    */
    public get<T>(id: string): T {

        if (this.isRegistered(id))
            return <T>this.container[id];
        else
            throw new Error("Could not find an ioc instance for id : '" + id + "'!");
    }
    
    /**
    * Checks for availability of a service/factory
    * 
    * @param {string} id The identifier of the service/factory to get
    * @return {boolean} True if something is registered, otherwise false
    */
    public isRegistered(id: string): boolean {
        return this.container[id] !== undefined;
    }

};
