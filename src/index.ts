import { Context, Schema } from "koishi";
import type {} from "@koishijs/cache";
import mc from "minecraftstatuspinger";

export const name = "mcsping";
export interface Config {}
export const inject = ["cache"];
export const Config: Schema<Config> = Schema.object({});

declare module "@koishijs/cache" {
  interface Tables {
    servers: string;
  }
}

export function apply(ctx: Context) {
  ctx.command("ping <id>").action(async ({ session, options }, id) => {
    const data: string = await ctx.cache.get("servers", id);
    mc.setDnsServers(["119.29.29.29", "8.8.8.8"]);
    try {
      if (data === undefined) {
        session.send(await getInfo(id));
      } else {
        session.send(await getInfo(data));
      }
    } catch (error) {
      session.send("[E] 请求失败");
    }
  });

  ctx.command("ping.del <id>").action(async ({ session, options }, id) => {
    await ctx.cache.delete("servers", id);
    const data: string = await ctx.cache.get("servers", id);

    if (data === undefined) {
      session.send("[I] 已删除");
    } else {
      session.send("[E] 删除失败");
    }
  });

  ctx
    .command("ping.edit <id> <link>")
    .action(async ({ session, options }, id, link) => {
      await ctx.cache.set("servers", id, link);
      const data: string = await ctx.cache.get("servers", id);

      if (data === link) {
        session.send("[I] 设置" + id + "为" + " " + data);
      } else {
        session.send("[E] 设置失败");
      }
    });

  ctx
    .command("ping.list [page:number]")
    .action(async ({ session, options }, page = 1) => {
      const data = ctx.cache.entries("servers");
      const size = 5;
      const async = await asyncIterator(data, size, page);

      for await (const pages of async) {
        session.send(
          "短码 | IP (第" +
            page +
            "页) " +
            "\n" +
            pages.join("\n").replace(",", "  ")
        );
      }
    });
}

type AsyncPage<T> = Promise<{ value: T[]; done: boolean }>;

async function asyncIterator<T>(
  asyncIterable: AsyncIterable<T>,
  pageSize: number,
  startPage: number = 1
): Promise<AsyncIterable<T[]>> {
  let currentPage: T[] = [];
  let iterator = asyncIterable[Symbol.asyncIterator]();
  let done = false;

  return {
    [Symbol.asyncIterator]() {
      let currentPageIndex = 0;
      return {
        async next(): AsyncPage<T> {
          if (done) {
            return { value: [], done: true };
          }
          while (currentPage.length < pageSize) {
            const { value, done: iterDone } = await iterator.next();
            if (iterDone) {
              done = true;
              break;
            }
            if (currentPageIndex >= (startPage - 1) * pageSize) {
              currentPage.push(value);
            }
            currentPageIndex++;
          }
          const result = { value: currentPage, done: false };
          currentPage = [];
          return result;
        },
      };
    },
  };
}

async function repleaceCon(params:any) {
  return params.replace(
    /(§[0123456789abcdefgklmnor])/g,
    ""
  );
}


async function getInfo(host: string): Promise<string> {
  let result = await mc.lookup({ host: host });
  let description: string;
  const values: string[] = [];
  let description_str = result.status.description;
  if(description_str.text === undefined) {
    description = await repleaceCon(description_str);
  } else {
    description = await repleaceCon(description_str.text);
  }

  if (result.status.players.sample !== undefined) {
    if (result.status.players.sample.length !== 0) {
      for (let i = 0; i < 5; i++) {
        values.push(result.status.players.sample[i].name);
      }
    }
  }
  let player_count = handleValue(values);
  return `喵哈喽～
${description}
服务器版本: [${result.status.version.protocol}] ${result.status.version.name}
延迟: ${result.latency}ms
在线人数: ${result.status.players.online}/${result.status.players.max}
[${player_count}]
`;
}

function handleValue(value: undefined | string[]): string {
  if (value.length === 0) {
    return "🕊️ Join Now?";
  } else {
    if (value === undefined) {
      return "无法读取玩家列表";
    }
    return value.join(", ");
  }
}
