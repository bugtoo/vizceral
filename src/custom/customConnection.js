/**
 *
 *  Copyright 2016 Netflix, Inc.
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */
import Connection from '../base/connection';
import ConnectionView from '../base/connectionView';

class CustomConnection extends Connection {
  constructor (options) {
    super(options);
    this.graphRenderer = 'custom';
  }

  update (data) {
    super.update(data);
    if (this.source.isEntryNode() && data.metrics) {
      this.target.loaded = true;
    }
  }

  render () {
    this.view = new ConnectionView(this);
  }

  isInteractive () {
    return false;
  }
}

export default CustomConnection;
