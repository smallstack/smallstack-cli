interface IOC {
    /**
    * Registers a service/factory
    * 
    * @param {string} id The identifier of the service/factory
    * @param {object} value The instance/constructor of the service/factory
    */
    register(id: string, value: Object): void;
    
    /**
    * Gets a service/factory by id
    * 
    * @param {string} id The identifier of the service/factory to get
    * @return {object} The instance/constructor of the service/factory
    */
    get<T>(id: string): T;
    
    /**
    * Checks for availability of a service/factory
    * 
    * @param {string} id The identifier of the service/factory to get
    * @return {boolean} True if something is registered, otherwise false
    */
    isRegistered(id: string): boolean;
};
