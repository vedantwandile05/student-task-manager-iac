import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

const server = new Server({
    name: "student-task-manager",
    version: "1.0.0",
}, {
    capabilities: { tools: {} }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list_directory",
                description: "List all files and folders in a directory so you can find the project files",
                inputSchema: { type: "object", properties: { dir_path: { type: "string" } }, required: ["dir_path"] }
            },
            {
                name: "read_file",
                description: "Read the exact code/text from a file on the local system",
                inputSchema: { type: "object", properties: { file_path: { type: "string" } }, required: ["file_path"] }
            },
            {
                name: "write_file",
                description: "Update, overwrite, or create a file with new code",
                inputSchema: { type: "object", properties: { file_path: { type: "string" }, content: { type: "string" } }, required: ["file_path", "content"] }
            },
            {
                name: "push_to_github",
                description: "Commits and pushes all local file changes to the GitHub repository",
                inputSchema: {
                    type: "object",
                    properties: { 
                        repo_path: { type: "string" },
                        commit_message: { type: "string" }
                    },
                    required: ["repo_path", "commit_message"]
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = request.params.arguments;
    
    if (request.params.name === "list_directory") {
        try {
            const files = await fs.readdir(args.dir_path);
            return { content: [{ type: "text", text: `Contents of ${args.dir_path}:\n` + files.join("\n") }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Failed to read directory: ${error.message}` }], isError: true };
        }
    }
    if (request.params.name === "read_file") {
        try {
            const content = await fs.readFile(args.file_path, "utf-8");
            return { content: [{ type: "text", text: content }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Failed to read file: ${error.message}` }], isError: true };
        }
    }
    if (request.params.name === "write_file") {
        try {
            await fs.writeFile(args.file_path, args.content, "utf-8");
            return { content: [{ type: "text", text: `Successfully updated the code inside ${args.file_path}!` }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Failed to write file: ${error.message}` }], isError: true };
        }
    }
    if (request.params.name === "push_to_github") {
        try {
            await execAsync("git add .", { cwd: args.repo_path });
            const safeMessage = args.commit_message.replace(/"/g, '\\"');
            await execAsync(`git commit -m "${safeMessage}"`, { cwd: args.repo_path });
            const { stdout, stderr } = await execAsync("git push", { cwd: args.repo_path });
            return { content: [{ type: "text", text: `Successfully pushed to GitHub!\n\nOutput:\n${stdout}\n${stderr}` }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Git error: ${error.message}` }], isError: true };
        }
    }
    throw new Error("Tool not found");
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Student Task Manager MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Server crashed:", error);
    process.exit(1);
});
