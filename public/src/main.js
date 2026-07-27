function load_script(src, remote = true, transfer = []) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function doJb() {
  await load_script("src/misc.js");

  try {
    version.init();
    switch (version.console) {
      case 4:
        await load_script("src/ps4/constants.js");
        await load_script("src/ps4/userland.js");
        break;
      case 5:
        //TODO
        break;
      default:
        logger.info(`Unsupported console ${version.console}`);
    }

    logger.info("===USERLAND===");

    let rw = undefined;
    if (arw.master === undefined) {
      rw = await init_rw();
    }

    init_arw(rw);
    init_rop();
    init_syscalls();

    logger.info("===END===");

    // Check if system is already jailbroken via setuid(0) ROP call (syscall 0x17 = 23)
    const setuid_fn = new NativeFunction(0x17, "number");
    const setuid_res = setuid_fn.invoke(0);
    logger.info(`Early jailbreak check (setuid 0) returned: ${setuid_res}`);

    if (setuid_res === 0) {
      logger.info("System is ALREADY jailbroken! Skipping kernel exploit chain to prevent Kernel Panic.");
      if (typeof window.onExploitAlreadyDone === "function") {
        window.onExploitAlreadyDone();
      }
      return;
    }

    await load_script("src/loader.js");
    await load_script("src/workers.js");

    switch (version.console) {
      case 4:
        await load_script("src/ps4/kernel.js");
        break;
      case 5:
        //TODO
        break;
      default:
        logger.info(`Unsupported console ${version.console}`);
    }

    await load_script(`src/${exploitChain}.js`);

    logger.info(`===${exploitChain.toUpperCase()}===`);

    try {
      if (exploitChain == "lapse") {
        init();
        await setup();
        await double_free_reqs2();
        leak_kaddrs();
        double_free_reqs1();
        make_karw();

        // Increase reference counts for the pipes
        inc_karw_pipe_refcnt();

        logger.info("Corrupted context cleanup started...");

        // Remove pktinfo pointers
        remove_pktinfo_from_so(pktopts_twins[0]);

        // Remove rthdr pointers
        remove_rthdr_from_so(pktopts_twins[1]);
        remove_rthdr_from_so(rthdr_twins[0]);

        logger.info("Corrupted context cleanup completed !!");
      } else {
        init();
        await setup();
        await ucred_triple_free();
        leak_kqueue();
        await make_karw();

        inc_karw_pipe_refcnt();

        logger.info("Corrupted context cleanup started...");

        // Remove rthdr pointers from triplets
        for (let i = 0; i < triplets.length; i++) {
          remove_rthdr_from_so(triplets[i]);
        }

        // Remove triple freed file from free list
        remove_uaf_file();

        logger.info("Corrupted context cleanup completed !!");
      }
    } finally {
      cleanup();
    }

    find_all_proc();

    // Avoid reapplying if already done
    if (fn.setuid.invoke(0) === -1) {
      jailbreak();

      const kpatches_rsp = await fetch(`src/ps4/patches/${constants.KPATCH}`);
      const kpatches_buf = await kpatches_rsp.arrayBuffer();
      const kpatches_u8 = new Uint8Array(kpatches_buf);

      kernel_patches(kpatches_u8);

      const bin_rsp = await fetch("src/payload.bin");
      if (!bin_rsp.ok) {
        throw new Error(`Failed to load payload from src/payload.bin (HTTP ${bin_rsp.status})`);
      }
      const bin_buf = await bin_rsp.arrayBuffer();
      const bin_u8 = new Uint8Array(bin_buf);

      load_bin(bin_u8);
    }

    logger.info("===END===");
    if (typeof window.onExploitSuccess === "function") {
      window.onExploitSuccess();
    }
  } catch (e) {
    logger.error(e.message);
    logger.error(e.stack);
    if (typeof window.onExploitFail === "function") {
      window.onExploitFail(e.message || "Execution error");
    }
    //mem.free_all();
  }
}

async function run_standalone_payload(payloadPath) {
  try {
    logger.info(`Loading standalone payload from ${payloadPath}...`);
    const bin_rsp = await fetch(payloadPath);
    if (!bin_rsp.ok) {
      throw new Error(`Failed to fetch payload from ${payloadPath} (HTTP ${bin_rsp.status})`);
    }
    const bin_buf = await bin_rsp.arrayBuffer();
    const bin_u8 = new Uint8Array(bin_buf);

    load_bin(bin_u8);
    logger.info(`Successfully injected payload ${payloadPath} !!`);
  } catch (e) {
    logger.error(`Standalone payload error: ${e.message}`);
  }
}
