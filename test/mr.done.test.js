
test('(25 pts) all.mr:ncdc', (done) => {
    let m1 = (key, value) => {
      let words = value.split(/(\s+)/).filter((e) => e !== ' ');
      console.log(words);
      let out = {};
      out[words[1]] = parseInt(words[3]);
      return out;
    };
  
    let r1 = (key, values) => {
      let out = {};
      out[key] = values.reduce((a, b) => Math.max(a, b), -Infinity);
      return out;
    };
  
    let dataset = [
      {'000': '006701199099999 1950 0515070049999999N9 +0000 1+9999'},
      {'106': '004301199099999 1950 0515120049999999N9 +0022 1+9999'},
      {'212': '004301199099999 1950 0515180049999999N9 -0011 1+9999'},
      {'318': '004301265099999 1949 0324120040500001N9 +0111 1+9999'},
      {'424': '004301265099999 1949 0324180040500001N9 +0078 1+9999'},
    ];
  
    let expected = [{'1950': 22}, {'1949': 111}];
  
    /* Sanity check: map and reduce locally */
    sanityCheck(m1, r1, dataset, expected, done);
  
    /* Now we do the same thing but on the cluster */
    const doMapReduce = (cb) => {
      distribution.ncdc.store.get(null, (e, v) => {
        try {
          expect(v.length).toBe(dataset.length);
        } catch (e) {
          done(e);
        }
  
  
        distribution.ncdc.mr.exec({keys: v, map: m1, reduce: r1}, (e, v) => {
          try {
            expect(v).toEqual(expect.arrayContaining(expected));
            done();
          } catch (e) {
            done(e);
          }
        });
      });
    };
  
    let cntr = 0;
  
    // We send the dataset to the cluster
    dataset.forEach((o) => {
      let key = Object.keys(o)[0];
      let value = o[key];
      distribution.ncdc.store.put(value, key, (e, v) => {
        cntr++;
        // Once we are done, run the map reduce
        if (cntr === dataset.length) {
          doMapReduce();
        }
      });
    });
  });
  
  test('(25 pts) all.mr:dlib', (done) => {
    let m2 = (key, value) => {
      // map each word to a key-value pair like {word: 1}
      let words = value.split(/(\s+)/).filter((e) => e !== ' ');
      let out = [];
      words.forEach((w) => {
        let o = {};
        o[w] = 1;
        out.push(o);
      });
      return out;
    };
  
    let r2 = (key, values) => {
      let out = {};
      out[key] = values.length;
      return out;
    };
  
    let dataset = [
      {'b1-l1': 'It was the best of times, it was the worst of times,'},
      {'b1-l2': 'it was the age of wisdom, it was the age of foolishness,'},
      {'b1-l3': 'it was the epoch of belief, it was the epoch of incredulity,'},
      {'b1-l4': 'it was the season of Light, it was the season of Darkness,'},
      {'b1-l5': 'it was the spring of hope, it was the winter of despair,'},
    ];
  
    let expected = [
      {It: 1}, {was: 10},
      {the: 10}, {best: 1},
      {of: 10}, {'times,': 2},
      {it: 9}, {worst: 1},
      {age: 2}, {'wisdom,': 1},
      {'foolishness,': 1}, {epoch: 2},
      {'belief,': 1}, {'incredulity,': 1},
      {season: 2}, {'Light,': 1},
      {'Darkness,': 1}, {spring: 1},
      {'hope,': 1}, {winter: 1},
      {'despair,': 1},
    ];
  
    /* Sanity check: map and reduce locally */
    sanityCheck(m2, r2, dataset, expected, done);
  
    /* Now we do the same thing but on the cluster */
    const doMapReduce = (cb) => {
      distribution.dlib.store.get(null, (e, v) => {
        try {
          expect(v.length).toBe(dataset.length);
        } catch (e) {
          done(e);
        }
  
        distribution.dlib.mr.exec({keys: v, map: m2, reduce: r2}, (e, v) => {
          try {
            expect(v).toEqual(expect.arrayContaining(expected));
            done();
          } catch (e) {
            done(e);
          }
        });
      });
    };
  
    let cntr = 0;
  
    // We send the dataset to the cluster
    dataset.forEach((o) => {
      let key = Object.keys(o)[0];
      let value = o[key];
      distribution.dlib.store.put(value, key, (e, v) => {
        cntr++;
        // Once we are done, run the map reduce
        if (cntr === dataset.length) {
          doMapReduce();
        }
      });
    });
  });
  