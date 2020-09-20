import { func } from "./other";

let unused = "abc".doesnotexist();

function main() {
	console.log("func: ", func());
}

main();
