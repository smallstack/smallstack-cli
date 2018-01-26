"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request-promise");
class ChangelogCommand {
    static getHelpSummary() {
        return "Creates a changelog based on gitlab issues and tags!";
    }
    static getParameters() {
        return {};
    }
    static execute(current, allCommands) {
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            const gitlabToken = "";
            // get project 
            let project = yield request.get("https://gitlab.com/api/v4/projects/smallstack%2Fproject-sata-loyalty", {
                headers: {
                    "PRIVATE-TOKEN": gitlabToken
                },
                json: true
            });
            console.log(project);
            // get all tags with dates
            // get all issues with closing dates
            // write changelog.md
            resolve();
        }));
    }
}
exports.ChangelogCommand = ChangelogCommand;
